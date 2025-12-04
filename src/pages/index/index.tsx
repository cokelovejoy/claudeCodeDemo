import { useState, useEffect } from 'react'
import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { socketManager } from '../../utils/socket'
import './index.scss'

// 配置（生产环境需替换为实际域名）
const API_BASE_URL = 'http://localhost:3000'
const WS_URL = 'ws://localhost:3000/ws' // 生产环境使用 wss://

export default function Index() {
  // 状态管理
  const [takeoffCount, setTakeoffCount] = useState<number>(0)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  // 组件挂载时建立 WebSocket 连接
  useEffect(() => {
    console.log('页面加载，开始建立 WebSocket 连接')

    // 连接 WebSocket
    socketManager.connect(WS_URL)
      .then(() => {
        console.log('WebSocket 连接成功')
        setIsConnected(true)
      })
      .catch(error => {
        console.error('WebSocket 连接失败:', error)
        setIsConnected(false)
        Taro.showToast({
          title: '连接失败',
          icon: 'error',
          duration: 2000
        })
      })

    // 监听 WebSocket 消息
    const unsubscribe = socketManager.onMessage((data) => {
      // 处理计数更新消息
      if (data.type === 'UPDATE_COUNT') {
        console.log('收到计数更新:', data.count)
        setTakeoffCount(data.count)
      }
    })

    // 组件卸载时清理
    return () => {
      console.log('页面卸载，关闭 WebSocket 连接')
      unsubscribe() // 取消消息监听
      socketManager.close() // 关闭连接
    }
  }, [])

  /**
   * 处理起飞按钮点击
   */
  const handleTakeoff = async () => {
    if (isLoading) {
      return // 防止重复点击
    }

    setIsLoading(true)

    try {
      const response = await Taro.request({
        url: `${API_BASE_URL}/api/takeoff`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        }
      })

      if (response.statusCode === 200 && response.data.success) {
        console.log('起飞成功:', response.data)

        // 显示成功提示
        Taro.showToast({
          title: '起飞成功！',
          icon: 'success',
          duration: 1500
        })

        // 注意：计数更新通过 WebSocket 广播接收，不需要手动更新
        // 这样可以确保所有客户端的数据一致性
      } else {
        throw new Error('起飞请求失败')
      }
    } catch (error) {
      console.error('起飞请求失败:', error)

      Taro.showToast({
        title: '起飞失败，请重试',
        icon: 'error',
        duration: 2000
      })
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * 手动重连
   */
  const handleReconnect = () => {
    setIsConnected(false)

    socketManager.connect(WS_URL)
      .then(() => {
        console.log('重连成功')
        setIsConnected(true)
        Taro.showToast({
          title: '连接成功',
          icon: 'success',
          duration: 1500
        })
      })
      .catch(error => {
        console.error('重连失败:', error)
        Taro.showToast({
          title: '重连失败',
          icon: 'error',
          duration: 2000
        })
      })
  }

  return (
    <View className='index-container'>
      {/* 连接状态指示器 */}
      <View className='status-bar'>
        <View className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
        <Text className='status-text'>
          {isConnected ? '实时连接中' : '连接已断开'}
        </Text>
        {!isConnected && (
          <Button className='reconnect-btn' size='mini' onClick={handleReconnect}>
            重连
          </Button>
        )}
      </View>

      {/* 主要内容区域 */}
      <View className='content'>
        {/* 标题 */}
        <Text className='title'>实时起飞人数</Text>

        {/* 计数显示 */}
        <View className='count-display'>
          <Text className='count-number'>{takeoffCount}</Text>
          <Text className='count-label'>人正在起飞</Text>
        </View>

        {/* 起飞按钮 */}
        <Button
          className='takeoff-btn'
          type='primary'
          size='default'
          loading={isLoading}
          disabled={!isConnected}
          onClick={handleTakeoff}
        >
          {isLoading ? '起飞中...' : '起飞'}
        </Button>

        {/* 提示文字 */}
        <Text className='hint-text'>
          点击按钮，所有在线用户将实时看到人数变化
        </Text>
      </View>
    </View>
  )
}
