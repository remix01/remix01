"use client"

import { useState, useEffect, useRef } from 'react'
import { Client as ConversationsClient, Conversation, Message as TwilioMessage, Participant } from '@twilio/conversations'
import { formatDistanceToNow, format } from 'date-fns'
import { sl } from 'date-fns/locale'
import { Send, Shield, Loader2, Lock, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { FirstContactModal } from './FirstContactModal'
import { BlockedMessageBanner } from './BlockedMessageBanner'

interface ChatWindowProps {
  jobId: string
  currentUserId: string
}

interface DisplayMessage {
  sid: string
  body: string
  author: string
  timestamp: Date
  isOwn: boolean
  isSystem: boolean
  isBlocked: boolean
}

export function ChatWindow({ jobId, currentUserId }: ChatWindowProps) {
  const [client, setClient] = useState<ConversationsClient | null>(null)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [otherParticipantName, setOtherParticipantName] = useState('Sogovornik')
  const [isOnline, setIsOnline] = useState(false)
  const [conversationStatus, setConversationStatus] = useState<'ACTIVE' | 'CLOSED' | 'SUSPENDED'>('ACTIVE')
  const [contactRevealed, setContactRevealed] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)
  const [showFirstContactModal, setShowFirstContactModal] = useState(false)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  // Initialize Twilio client
  useEffect(() => {
    let mounted = true
    let conversationClient: ConversationsClient | null = null

    async function initializeTwilio() {
      try {
        // Get access token
        const response = await fetch(`/api/conversations/token?jobId=${jobId}`)
        const { token } = await response.json()

        if (!mounted) return

        // Initialize Conversations client
        conversationClient = new ConversationsClient(token)

        // Wait for client to be ready
        await new Promise<void>((resolve) => {
          conversationClient!.on('initialized', () => resolve())
        })

        if (!mounted) return

        // Get or create conversation for this job
        const conversations = await conversationClient.getSubscribedConversations()
        let conv = conversations.items.find((c) => c.uniqueName === `job_${jobId}`)
        
        if (!conv) {
          // Create conversation if it doesn't exist
          conv = await conversationClient.createConversation({
            uniqueName: `job_${jobId}`,
            friendlyName: `Job ${jobId}`,
          })
        }

        if (!mounted) return

        // Join conversation
        try {
          await conv.join()
        } catch (e) {
          // Already joined
        }

        // Load messages
        const messagePaginator = await conv.getMessages()
        const twilioMessages = messagePaginator.items

        const displayMessages: DisplayMessage[] = twilioMessages.map((msg) => ({
          sid: msg.sid,
          body: msg.body || '',
          author: msg.author || 'system',
          timestamp: msg.dateCreated || new Date(),
          isOwn: msg.author === currentUserId,
          isSystem: msg.author === 'LiftGO',
          isBlocked: msg.attributes && (msg.attributes as any).blocked === true,
        }))

        setMessages(displayMessages)
        setConversation(conv)
        setClient(conversationClient)

        // Get other participant info
        const participants = await conv.getParticipants()
        const otherParticipant = participants.find((p) => p.identity !== currentUserId)
        if (otherParticipant) {
          setOtherParticipantName(otherParticipant.identity)
          // Check if online (simplified - you'd implement presence logic)
          setIsOnline(false)
        }

        // Subscribe to new messages
        conv.on('messageAdded', (message: TwilioMessage) => {
          const newMessage: DisplayMessage = {
            sid: message.sid,
            body: message.body || '',
            author: message.author || 'system',
            timestamp: message.dateCreated || new Date(),
            isOwn: message.author === currentUserId,
            isSystem: message.author === 'LiftGO',
            isBlocked: message.attributes && (message.attributes as any).blocked === true,
          }
          setMessages((prev) => [...prev, newMessage])
          
          if (newMessage.isBlocked && newMessage.isOwn) {
            setBlockedCount((prev) => prev + 1)
          }
        })

        // Subscribe to typing indicators
        conv.on('typingStarted', (participant: Participant) => {
          if (participant.identity !== currentUserId) {
            setIsTyping(true)
          }
        })

        conv.on('typingEnded', (participant: Participant) => {
          if (participant.identity !== currentUserId) {
            setIsTyping(false)
          }
        })

        setIsLoading(false)

        // Check if should show first contact modal
        const warningKey = `warned_${jobId}`
        const hasSeenWarning = sessionStorage.getItem(warningKey)
        if (!hasSeenWarning) {
          setShowFirstContactModal(true)
        }
      } catch (error) {
        console.error('[v0] Error initializing Twilio:', error)
        setIsLoading(false)
      }
    }

    initializeTwilio()

    return () => {
      mounted = false
      if (conversationClient) {
        conversationClient.removeAllListeners()
      }
    }
  }, [jobId, currentUserId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const sendMessage = async () => {
    if (!messageText.trim() || !conversation || isSending) return

    setIsSending(true)
    try {
      await conversation.sendMessage(messageText.trim())
      setMessageText('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('[v0] Error sending message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value)
    
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'

    // Send typing indicator
    if (conversation) {
      conversation.typing()
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        // Typing ended after 3 seconds
      }, 3000)
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return format(date, 'HH:mm')
    } else {
      return format(date, "d. MMM 'ob' HH:mm", { locale: sl })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-lg border bg-card">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Nalagam klepet...</p>
        </div>
      </div>
    )
  }

  const isDisabled = conversationStatus === 'CLOSED' || conversationStatus === 'SUSPENDED'

  return (
    <>
      <FirstContactModal
        isOpen={showFirstContactModal}
        onClose={() => {
          setShowFirstContactModal(false)
          sessionStorage.setItem(`warned_${jobId}`, 'true')
        }}
      />
      
      <BlockedMessageBanner count={blockedCount} />

      <div className="flex h-[600px] flex-col rounded-lg border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(otherParticipantName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{otherParticipantName}</h3>
                <Circle
                  className={cn(
                    'h-2 w-2',
                    isOnline ? 'fill-green-500 text-green-500' : 'fill-muted text-muted'
                  )}
                />
              </div>
              {isTyping && (
                <p className="text-xs text-muted-foreground">Tipka...</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <Lock className="h-3 w-3" />
              Zaščiten klepet · LiftGO
            </Badge>
            {contactRevealed && (
              <Button size="sm" variant="outline">
                Prikaži kontakt
              </Button>
            )}
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <div className="flex flex-col gap-4">
            {messages.map((message) => {
              if (message.isSystem) {
                return (
                  <div key={message.sid} className="flex justify-center">
                    <div className="flex max-w-md items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-center">
                      <Shield className="h-4 w-4 text-primary" />
                      <p className="text-sm text-primary">{message.body}</p>
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={message.sid}
                  className={cn(
                    'flex gap-2',
                    message.isOwn ? 'justify-end' : 'justify-start'
                  )}
                >
                  {!message.isOwn && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-muted text-xs">
                        {getInitials(message.author)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn('flex max-w-[70%] flex-col gap-1', message.isOwn && 'items-end')}>
                    <div
                      className={cn(
                        'rounded-2xl px-4 py-2',
                        message.isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted',
                        message.isBlocked && 'border-2 border-destructive'
                      )}
                    >
                      {message.isBlocked ? (
                        <div className="flex items-center gap-2">
                          <span>🚫</span>
                          <p className="text-sm">
                            Sporočilo blokirano — kontaktni podatki niso dovoljeni
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
                      )}
                    </div>
                    <span className="px-2 text-xs text-muted-foreground">
                      {formatTimestamp(message.timestamp)}
                    </span>
                  </div>
                  
                  {message.isOwn && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {getInitials('Vi')}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={messageText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isDisabled ? 'Klepet je zaprt' : 'Vnesite sporočilo...'}
              disabled={isDisabled || isSending}
              className="min-h-[44px] max-h-24 resize-none"
              rows={1}
            />
            <Button
              onClick={sendMessage}
              disabled={!messageText.trim() || isDisabled || isSending}
              size="icon"
              className="shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {isDisabled && (
            <p className="mt-2 text-xs text-muted-foreground">
              {conversationStatus === 'SUSPENDED'
                ? 'Klepet je začasno ustavljen zaradi kršitve pogojev'
                : 'Klepet je zaprt'}
            </p>
          )}
        </div>
      </div>
    </>
  )
}
