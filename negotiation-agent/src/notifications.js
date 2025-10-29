import db from './db.js';
import logger from './logger.js';

/**
 * Notification types
 */
export const NotificationType = {
  NEGOTIATION_INITIATED: 'negotiation_initiated',
  NEGOTIATION_ROUND: 'negotiation_round',
  NEGOTIATION_ACCEPTED: 'negotiation_accepted',
  NEGOTIATION_REJECTED: 'negotiation_rejected',
  NEGOTIATION_TIMEOUT: 'negotiation_timeout',
  LICENSE_CREATED: 'license_created',
  STRATEGY_MATCH: 'strategy_match'
};

/**
 * Create a notification
 */
export async function createNotification({
  publisherId,
  type,
  title,
  message,
  metadata = {},
  relatedEntityType = null,
  relatedEntityId = null
}) {
  try {
    const result = await db.query(
      `INSERT INTO notifications (
        publisher_id,
        type,
        title,
        message,
        metadata,
        related_entity_type,
        related_entity_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        publisherId,
        type,
        title,
        message,
        JSON.stringify(metadata),
        relatedEntityType,
        relatedEntityId
      ]
    );

    logger.info('Notification created', {
      id: result.rows[0].id,
      publisherId,
      type,
      title
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to create notification', {
      error: error.message,
      publisherId,
      type
    });
    throw error;
  }
}

/**
 * Format price for display
 */
function formatPrice(price) {
  if (typeof price === 'number') {
    return `$${price.toFixed(4)}`;
  }
  return price || 'N/A';
}

/**
 * Create notification when negotiation is initiated
 */
export async function notifyNegotiationInitiated({
  publisherId,
  negotiationId,
  clientName,
  partnerType,
  useCase,
  proposedPrice
}) {
  const title = `New negotiation from ${clientName}`;
  const message = `${clientName} (${partnerType}) initiated a negotiation for ${useCase} use. Proposed price: ${formatPrice(proposedPrice)}`;
  
  await createNotification({
    publisherId,
    type: NotificationType.NEGOTIATION_INITIATED,
    title,
    message,
    metadata: {
      client_name: clientName,
      partner_type: partnerType,
      use_case: useCase,
      proposed_price: proposedPrice
    },
    relatedEntityType: 'negotiation',
    relatedEntityId: negotiationId
  });
}

/**
 * Create notification for negotiation round update
 */
export async function notifyNegotiationRound({
  publisherId,
  negotiationId,
  clientName,
  roundNumber,
  action,
  proposedPrice
}) {
  const title = `${clientName} - Round ${roundNumber}`;
  const actionText = {
    propose: 'proposed new terms',
    counter: 'countered with new terms',
    accept: 'accepted the terms',
    reject: 'rejected the terms'
  }[action] || action;
  
  const message = `${clientName} ${actionText} in round ${roundNumber}${proposedPrice ? '. Price: ' + formatPrice(proposedPrice) : ''}`;
  
  await createNotification({
    publisherId,
    type: NotificationType.NEGOTIATION_ROUND,
    title,
    message,
    metadata: {
      client_name: clientName,
      round_number: roundNumber,
      action,
      proposed_price: proposedPrice
    },
    relatedEntityType: 'negotiation',
    relatedEntityId: negotiationId
  });
}

/**
 * Create notification when negotiation is accepted
 */
export async function notifyNegotiationAccepted({
  publisherId,
  negotiationId,
  clientName,
  finalPrice,
  licenseId = null
}) {
  const title = `✅ Negotiation accepted with ${clientName}`;
  const message = `Agreement reached with ${clientName}. Final price: ${formatPrice(finalPrice)}${licenseId ? `. License #${licenseId} created.` : ''}`;
  
  await createNotification({
    publisherId,
    type: NotificationType.NEGOTIATION_ACCEPTED,
    title,
    message,
    metadata: {
      client_name: clientName,
      final_price: finalPrice,
      license_id: licenseId
    },
    relatedEntityType: 'negotiation',
    relatedEntityId: negotiationId
  });
}

/**
 * Create notification when negotiation is rejected
 */
export async function notifyNegotiationRejected({
  publisherId,
  negotiationId,
  clientName,
  reason
}) {
  const title = `❌ Negotiation rejected with ${clientName}`;
  const message = `Negotiation with ${clientName} was rejected. Reason: ${reason || 'Terms not acceptable'}`;
  
  await createNotification({
    publisherId,
    type: NotificationType.NEGOTIATION_REJECTED,
    title,
    message,
    metadata: {
      client_name: clientName,
      reason
    },
    relatedEntityType: 'negotiation',
    relatedEntityId: negotiationId
  });
}

/**
 * Create notification when negotiation times out
 */
export async function notifyNegotiationTimeout({
  publisherId,
  negotiationId,
  clientName
}) {
  const title = `⏱️ Negotiation timeout with ${clientName}`;
  const message = `Negotiation with ${clientName} has timed out without reaching an agreement.`;
  
  await createNotification({
    publisherId,
    type: NotificationType.NEGOTIATION_TIMEOUT,
    title,
    message,
    metadata: {
      client_name: clientName
    },
    relatedEntityType: 'negotiation',
    relatedEntityId: negotiationId
  });
}

/**
 * Create notification when license is created
 */
export async function notifyLicenseCreated({
  publisherId,
  licenseId,
  clientName,
  price
}) {
  const title = `📄 New license created for ${clientName}`;
  const message = `License #${licenseId} has been created for ${clientName}. Price: ${formatPrice(price)}`;
  
  await createNotification({
    publisherId,
    type: NotificationType.LICENSE_CREATED,
    title,
    message,
    metadata: {
      license_id: licenseId,
      client_name: clientName,
      price
    },
    relatedEntityType: 'license',
    relatedEntityId: String(licenseId)
  });
}

export default {
  NotificationType,
  createNotification,
  notifyNegotiationInitiated,
  notifyNegotiationRound,
  notifyNegotiationAccepted,
  notifyNegotiationRejected,
  notifyNegotiationTimeout,
  notifyLicenseCreated
};
