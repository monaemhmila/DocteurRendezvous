import { Router, Request, Response } from "express";
import { sseService } from "./sse.service";

const router = Router();

router.get("/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Send an initial heartbeat to establish connection
  res.write("data: connected\n\n");

  sseService.addClient(res);

  req.on("close", () => {
    sseService.removeClient(res);
  });
});

export default router;
