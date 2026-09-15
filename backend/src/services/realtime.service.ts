import { Response } from 'express';
import { EventEmitter } from 'events';

class RealtimeService extends EventEmitter {
  private complaintClients: Set<{ res: Response; moderatorUID?: string }> = new Set();
  private statsClients: Set<{ res: Response }> = new Set();

  constructor() {
    super();
    this.setMaxListeners(100);
  }

  public subscribeComplaints(res: Response, moderatorUID?: string, getInitialData?: () => Promise<any>): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const client = { res, moderatorUID };
    this.complaintClients.add(client);

    // Send initial data if provider provided
    if (getInitialData) {
      getInitialData().then((data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }).catch((err) => {
        console.error('Error sending initial complaints SSE data:', err);
      });
    }

    res.on('close', () => {
      this.complaintClients.delete(client);
    });
  }

  public subscribeStats(res: Response, getInitialStats?: () => Promise<any>): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const client = { res };
    this.statsClients.add(client);

    if (getInitialStats) {
      getInitialStats().then((data) => {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }).catch((err) => {
        console.error('Error sending initial stats SSE data:', err);
      });
    }

    res.on('close', () => {
      this.statsClients.delete(client);
    });
  }

  public broadcastComplaints(getDataForModerator: (modUid?: string) => Promise<any>): void {
    this.complaintClients.forEach(async (client) => {
      try {
        const data = await getDataForModerator(client.moderatorUID);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('Error broadcasting complaints SSE:', err);
      }
    });
  }

  public broadcastStats(getStats: () => Promise<any>): void {
    this.statsClients.forEach(async (client) => {
      try {
        const data = await getStats();
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error('Error broadcasting stats SSE:', err);
      }
    });
  }
}

export const realtimeService = new RealtimeService();
