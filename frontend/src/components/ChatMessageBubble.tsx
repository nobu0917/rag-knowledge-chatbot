import type { ChatMessage } from '../types';
import { SourceList } from './SourceList';

type Props = {
  message: ChatMessage;
};

export function ChatMessageBubble({ message }: Props) {
  const isUser = message.role === 'user';
  return (
    <div className={`message-row ${isUser ? 'message-row-user' : 'message-row-bot'}`}>
      {!isUser && <div className="avatar">🤖</div>}
      <div
        className={`bubble ${isUser ? 'bubble-user' : 'bubble-bot'}${message.isError ? ' bubble-error' : ''}`}
      >
        <p className="bubble-text">{message.text}</p>
        {!isUser && message.sources && <SourceList sources={message.sources} />}
        {!isUser && message.sources && message.sources.length === 0 && (
          <p className="no-source-note">※ 出典なし（ドキュメント内に該当記載がないため回答を控えています）</p>
        )}
      </div>
    </div>
  );
}
