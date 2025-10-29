import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import db from './db.js';
import redis from './redis.js';
import logger from './logger.js';
import { NegotiationEngine } from './negotiation-engine.js';
import { LicenseGenerator } from './license-generator.js';
import NegotiationMCPServer from './mcp-server.js';
import { notifyNegotiationAccepted, notifyNegotiationRejected, notifyLicenseCreated } from './notifications.js';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGINS || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(express.json());

// Initialize engines
const negotiationEngine = new NegotiationEngine();
const licenseGenerator = new LicenseGenerator();

// Store socket connections by publisher ID
const publisherSockets = new Map();

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  socket.on('subscribe:publisher', (publisherId) => {
    const room = `publisher:${publisherId}`;
    socket.join(room);
    logger.info('Client subscribed to publisher', { publisherId, socketId: socket.id });
    
    if (!publisherSockets.has(publisherId)) {
      publisherSockets.set(publisherId, new Set());
    }
    publisherSockets.get(publisherId).add(socket.id);
  });

  socket.on('unsubscribe:publisher', (publisherId) => {
    const room = `publisher:${publisherId}`;
    socket.leave(room);
    logger.info('Client unsubscribed from publisher', { publisherId, socketId: socket.id });
    
    if (publisherSockets.has(publisherId)) {
      publisherSockets.get(publisherId).delete(socket.id);
    }
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
    // Clean up socket references
    for (const [publisherId, sockets] of publisherSockets.entries()) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        publisherSockets.delete(publisherId);
      }
    }
  });
});

// Helper function to broadcast negotiation updates
export function broadcastNegotiationUpdate(publisherId, event, data) {
  const room = `publisher:${publisherId}`;
  io.to(room).emit(event, data);
  logger.info('Broadcast negotiation update', { publisherId, event });
}

// Make io and broadcast available to negotiation engine
negotiationEngine.io = io;
negotiationEngine.broadcast = broadcastNegotiationUpdate;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'negotiation-agent' });
});

/**
 * REST API Endpoints for management and monitoring
 * The MCP server handles AI-to-AI negotiation
 * These endpoints are for publishers to manage strategies and view negotiations
 */

// Initiate negotiation (for testing, normally done via MCP)
app.post('/api/negotiations/initiate', async (req, res) => {
  try {
    const { publisher_hostname, client_name, proposed_terms, url_patterns, context } = req.body;

    // Get publisher ID
    const publisherResult = await db.query(
      'SELECT id FROM publishers WHERE hostname = $1',
      [publisher_hostname]
    );

    if (publisherResult.rows.length === 0) {
      return res.status(404).json({ error: `Publisher not found: ${publisher_hostname}` });
    }

    const publisherId = publisherResult.rows[0].id;

    const result = await negotiationEngine.initiateNegotiation(
      proposed_terms,
      publisherId,
      client_name,
      null,
      { url_patterns, ...context }
    );

    res.json(result);
  } catch (error) {
    logger.error('Failed to initiate negotiation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Submit counter-offer (for testing, normally done via MCP)
app.post('/api/negotiations/counter', async (req, res) => {
  try {
    const { negotiation_id, counter_terms } = req.body;
    const result = await negotiationEngine.processCounterProposal(negotiation_id, counter_terms);
    res.json(result);
  } catch (error) {
    logger.error('Failed to process counter-offer', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// List publishers (for testing)
app.get('/api/publishers', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.hostname, 
              COUNT(DISTINCT ps.id) as policy_count
       FROM publishers p
       LEFT JOIN policies ps ON p.id = ps.publisher_id
       GROUP BY p.id, p.name, p.hostname
       ORDER BY p.name`
    );
    res.json(result.rows);
  } catch (error) {
    logger.error('Failed to list publishers', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get all negotiations for a publisher
app.get('/api/negotiations/publisher/:publisherId', async (req, res) => {
  try {
    const { publisherId } = req.params;
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT n.*, 
             s.negotiation_style,
             s.min_price,
             s.max_price,
             s.preferred_price,
             s.pricing_model,
             (SELECT COUNT(*) FROM negotiation_rounds WHERE negotiation_id = n.id) as round_count
      FROM negotiations n
      LEFT JOIN partner_negotiation_strategies s ON n.strategy_id = s.id
      WHERE n.publisher_id = $1
    `;
    const params = [publisherId];

    if (status) {
      query += ` AND n.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY n.initiated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({
      negotiations: result.rows,
      count: result.rows.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    logger.error('Failed to get negotiations', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Get negotiation details
app.get('/api/negotiations/:negotiationId', async (req, res) => {
  try {
    const { negotiationId } = req.params;
    const status = await negotiationEngine.getNegotiationStatus(negotiationId);
    res.json(status);
  } catch (error) {
    logger.error('Failed to get negotiation status', { error: error.message });
    res.status(404).json({ error: error.message });
  }
});

// Get negotiation strategies for a publisher
app.get('/api/strategies/publisher/:publisherId', async (req, res) => {
  try {
    const { publisherId } = req.params;
    const strategies = await negotiationEngine.strategyMatcher.getPublisherStrategies(publisherId);
    res.json(strategies);
  } catch (error) {
    logger.error('Failed to get strategies', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Create a new negotiation strategy
app.post('/api/strategies', async (req, res) => {
  try {
    const { publisher_id, ...strategyData } = req.body;
    const strategy = await negotiationEngine.strategyMatcher.createStrategy(publisher_id, strategyData);
    res.status(201).json(strategy);
  } catch (error) {
    logger.error('Failed to create strategy', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Update a negotiation strategy
app.put('/api/strategies/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;
    const strategy = await negotiationEngine.strategyMatcher.updateStrategy(strategyId, req.body);
    res.json(strategy);
  } catch (error) {
    logger.error('Failed to update strategy', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Delete a negotiation strategy
app.delete('/api/strategies/:strategyId', async (req, res) => {
  try {
    const { strategyId } = req.params;
    await negotiationEngine.strategyMatcher.deleteStrategy(strategyId);
    res.status(204).send();
  } catch (error) {
    logger.error('Failed to delete strategy', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Accept a negotiation and auto-create license
app.post('/api/negotiations/:negotiationId/accept', async (req, res) => {
  try {
    const { negotiationId } = req.params;
    const { publisherId } = req.body;

    if (!publisherId) {
      return res.status(400).json({ error: 'publisherId is required' });
    }

    // Get the negotiation
    const negResult = await db.query(
      'SELECT * FROM negotiations WHERE id = $1',
      [negotiationId]
    );

    if (negResult.rows.length === 0) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const negotiation = negResult.rows[0];

    if (negotiation.status === 'accepted') {
      return res.status(400).json({ error: 'Negotiation already accepted' });
    }

    // Extract terms from current_terms or final_terms
    const terms = negotiation.final_terms || negotiation.current_terms || {};
    
    // Create license from negotiated terms
    // Generate a unique license_id
    const licenseId = `lic_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const licenseInsert = await db.query(`
      INSERT INTO license_options (
        license_id,
        publisher_id,
        license_type,
        price,
        currency,
        status,
        term_months,
        max_word_count,
        attribution_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      licenseId,
      publisherId,
      negotiation.license_type || 1,
      terms.price || terms.preferred_price || 0.005,
      terms.currency || 'USD',
      'active',
      terms.term_months || 12,
      terms.max_word_count || null,
      terms.attribution_required || false
    ]);

    const license = licenseInsert.rows[0];

    // Update negotiation status
    await db.query(`
      UPDATE negotiations 
      SET status = 'accepted',
          final_terms = $1::jsonb,
          completed_at = NOW(),
          license_id = $2,
          updated_at = NOW()
      WHERE id = $3
    `, [JSON.stringify(terms), license.id, negotiationId]);

    // Emit WebSocket event
    const publisherRoom = `publisher:${publisherId}`;
    io.to(publisherRoom).emit('negotiation:accepted', {
      negotiationId,
      licenseId: license.id,
      license,
      timestamp: new Date().toISOString()
    });

    // Create notifications
    await notifyNegotiationAccepted({
      publisherId,
      negotiationId,
      clientName: negotiation.client_name,
      finalPrice: terms.price || terms.preferred_price,
      licenseId: license.id
    }).catch(err => logger.error('Failed to create notification', err));

    await notifyLicenseCreated({
      publisherId,
      licenseId: license.id,
      clientName: negotiation.client_name,
      price: terms.price || terms.preferred_price
    }).catch(err => logger.error('Failed to create notification', err));

    logger.info('Negotiation accepted and license created', {
      negotiationId,
      licenseId: license.id,
      publisherId
    });

    res.json({
      success: true,
      negotiationId,
      status: 'accepted',
      license
    });
  } catch (error) {
    logger.error('Failed to accept negotiation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Reject a negotiation
app.post('/api/negotiations/:negotiationId/reject', async (req, res) => {
  try {
    const { negotiationId } = req.params;
    const { publisherId, reason } = req.body;

    if (!publisherId) {
      return res.status(400).json({ error: 'publisherId is required' });
    }

    // Update negotiation status
    const result = await db.query(`
      UPDATE negotiations 
      SET status = 'rejected',
          completed_at = NOW(),
          context = context || jsonb_build_object('rejection_reason', $1),
          updated_at = NOW()
      WHERE id = $2 AND publisher_id = $3
      RETURNING *
    `, [reason || 'Rejected by publisher', negotiationId, publisherId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Emit WebSocket event
    const publisherRoom = `publisher:${publisherId}`;
    io.to(publisherRoom).emit('negotiation:rejected', {
      negotiationId,
      reason: reason || 'Rejected by publisher',
      timestamp: new Date().toISOString()
    });

    // Create notification
    const negotiation = result.rows[0];
    await notifyNegotiationRejected({
      publisherId,
      negotiationId,
      clientName: negotiation.client_name,
      reason: reason || 'Rejected by publisher'
    }).catch(err => logger.error('Failed to create notification', err));

    logger.info('Negotiation rejected', { negotiationId, publisherId, reason });

    res.json({
      success: true,
      negotiationId,
      status: 'rejected'
    });
  } catch (error) {
    logger.error('Failed to reject negotiation', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Generate license from completed negotiation
app.post('/api/negotiations/:negotiationId/generate-license', async (req, res) => {
  try {
    const { negotiationId } = req.params;
    const license = await licenseGenerator.generateLicenseFromNegotiation(negotiationId);
    res.json(license);
  } catch (error) {
    logger.error('Failed to generate license', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Analytics: Negotiation statistics
app.get('/api/analytics/negotiations', async (req, res) => {
  try {
    const { publisherId, days = 30 } = req.query;

    let query = `
      SELECT 
        status,
        COUNT(*) as count,
        AVG(current_round) as avg_rounds,
        AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))) as avg_duration_seconds
      FROM negotiations
      WHERE initiated_at >= NOW() - INTERVAL '${parseInt(days)} days'
    `;

    const params = [];
    if (publisherId) {
      query += ` AND publisher_id = $1`;
      params.push(publisherId);
    }

    query += ` GROUP BY status ORDER BY count DESC`;

    const result = await db.query(query, params);

    res.json({
      period_days: parseInt(days),
      statistics: result.rows
    });
  } catch (error) {
    logger.error('Failed to get analytics', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// Start Express server
httpServer.listen(PORT, () => {
  logger.info(`Negotiation Agent HTTP server listening on port ${PORT}`);
  logger.info(`WebSocket server ready for real-time updates`);
});

// Start MCP server (stdio)
if (process.env.START_MCP === 'true') {
  const mcpServer = new NegotiationMCPServer();
  mcpServer.start().catch((error) => {
    logger.error('Failed to start MCP server', { error: error.message });
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await db.end();
  await redis.quit();
  process.exit(0);
});

export default app;
