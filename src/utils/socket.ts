import Taro from '@tarojs/taro'

export type MessageHandler = (data: any) => void

class SocketManager {
  private socketTask: Taro.SocketTask | null = null
  private url: string = ''
  private messageHandlers: Set<MessageHandler> = new Set()
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectDelay: number = 3000
  private isManualClose: boolean = false

  /**
   * 连接 WebSocket
   * @param url WebSocket 地址（ws:// 或 wss://）
   */
  connect(url: string): Promise<void> {
    this.url = url
    this.isManualClose = false

    return new Promise((resolve, reject) => {
      try {
        // 创建 WebSocket 连接
        this.socketTask = Taro.connectSocket({
          url: this.url,
          success: () => {
            console.log('WebSocket 连接已创建')
          },
          fail: (error) => {
            console.error('WebSocket 连接创建失败:', error)
            reject(error)
          }
        })

        // 监听打开事件
        this.socketTask.onOpen(() => {
          console.log('WebSocket 连接已建立')
          this.reconnectAttempts = 0 // 重置重连次数
          resolve()
        })

        // 监听消息
        this.socketTask.onMessage((res) => {
          try {
            const data = typeof res.data === 'string' ? JSON.parse(res.data) : res.data
            console.log('收到 WebSocket 消息:', data)

            // 触发所有消息处理器
            this.messageHandlers.forEach(handler => {
              handler(data)
            })
          } catch (error) {
            console.error('解析 WebSocket 消息失败:', error)
          }
        })

        // 监听关闭事件
        this.socketTask.onClose(() => {
          console.log('WebSocket 连接已关闭')
          this.socketTask = null

          // 如果不是主动关闭，尝试重连
          if (!this.isManualClose) {
            this.tryReconnect()
          }
        })

        // 监听错误事件
        this.socketTask.onError((error) => {
          console.error('WebSocket 错误:', error)
          Taro.showToast({
            title: '连接异常',
            icon: 'error',
            duration: 2000
          })
        })
      } catch (error) {
        console.error('WebSocket 连接异常:', error)
        reject(error)
      }
    })
  }

  /**
   * 尝试重新连接
   */
  private tryReconnect() {
    // 清除之前的重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }

    // 检查重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('达到最大重连次数，停止重连')
      Taro.showToast({
        title: '连接失败，请稍后重试',
        icon: 'none',
        duration: 3000
      })
      return
    }

    this.reconnectAttempts++
    console.log(`尝试第 ${this.reconnectAttempts} 次重连...`)

    Taro.showToast({
      title: `重连中(${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
      icon: 'loading',
      duration: this.reconnectDelay
    })

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url).catch(error => {
        console.error('重连失败:', error)
      })
    }, this.reconnectDelay)
  }

  /**
   * 发送消息
   * @param data 要发送的数据
   */
  send(data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socketTask) {
        reject(new Error('WebSocket 未连接'))
        return
      }

      this.socketTask.send({
        data: typeof data === 'string' ? data : JSON.stringify(data),
        success: () => {
          console.log('消息发送成功')
          resolve()
        },
        fail: (error) => {
          console.error('消息发送失败:', error)
          reject(error)
        }
      })
    })
  }

  /**
   * 添加消息处理器
   * @param handler 消息处理函数
   */
  onMessage(handler: MessageHandler) {
    this.messageHandlers.add(handler)

    // 返回取消订阅函数
    return () => {
      this.messageHandlers.delete(handler)
    }
  }

  /**
   * 关闭 WebSocket 连接
   */
  close() {
    this.isManualClose = true

    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // 关闭连接
    if (this.socketTask) {
      this.socketTask.close({
        success: () => {
          console.log('WebSocket 主动关闭成功')
        },
        fail: (error) => {
          console.error('WebSocket 关闭失败:', error)
        }
      })
      this.socketTask = null
    }

    // 清空消息处理器
    this.messageHandlers.clear()
  }

  /**
   * 检查连接状态
   */
  isConnected(): boolean {
    return this.socketTask !== null
  }
}

// 导出单例
export const socketManager = new SocketManager()
