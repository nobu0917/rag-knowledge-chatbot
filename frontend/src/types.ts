export type Source = {
  docName: string;
  page: number;
  excerpt: string;
};

export type Answer = {
  text: string;
  sources: Source[];
};

export type ChatMessage = {
  id: number;
  role: 'user' | 'bot';
  text: string;
  sources?: Source[];
};

export type DocFile = {
  id: number;
  name: string;
};
