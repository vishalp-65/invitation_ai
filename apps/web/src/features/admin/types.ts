export interface TemplateStat {
  id: string;
  name: string;
  family: string | null;
  source: 'builtin' | 'marketplace' | 'catalog';
  premium: boolean;
  featured: boolean;
  hidden: boolean;
  eventTypes: string[] | 'all';
  tags: string[];
  coverPage?: unknown;
  invitations: number;
  invitationsInRange: number;
  views: number;
  selects: number;
  orders: number;
  revenuePaise: number;
  last7: number;
  trend: number;
  trendScore: number;
}
