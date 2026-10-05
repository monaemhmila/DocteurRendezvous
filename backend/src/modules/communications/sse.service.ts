import { Request, Response } from "express";

class SSEService {
  private clients: Response[] = [];

  /**
   * Add a new client to the SSE stream
   */
  addClient(res: Response) {
    this.clients.push(res);
  }

  /**
   * Remove a disconnected client
   */
  removeClient(res: Response) {
    this.clients = this.clients.filter((client) => client !== res);
  }

  /**
   * Broadcast an event to all connected clients
   */
  broadcast(event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.clients.forEach((client) => {
      try {
        client.write(payload);
      } catch (err) {
        // Ignored
      }
    });
  }

  /**
   * Send human escalation notification
   */
  notifyHumanEscalation(tenantId: string, conversationId: string, patientName: string, reason: string) {
    console.log(`[SSE] Broadcasting human escalation for conversation ${conversationId}`);
    this.broadcast("human_escalation", {
      tenantId,
      conversationId,
      patientName,
      reason,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Broadcast new message received
   */
  notifyNewMessage(tenantId: string, conversationId: string, message: any) {
    this.broadcast("new_message", {
      tenantId,
      conversationId,
      message
    });
  }
}

export const sseService = new SSEService();
