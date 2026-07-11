const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onCall, HttpsError, onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { getDownloadURL } = require('firebase-admin/storage');
const logger = require('firebase-functions/logger');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// Centralized WhatsApp template configuration
const currentWhatsappTemplate = "receipt_generated";

// Global Options for all Functions (asia-south1 region)
setGlobalOptions({ region: 'asia-south1' });

// ========================================================
// 1. HELPERS
// ========================================================

/**
 * Format phone number to international standard (E.164 without plus)
 */
function formatPhoneNumber(mobile) {
  if (!mobile) return '';
  const digits = mobile.replace(/\D/g, '');
  if (digits.length === 10) {
    return `91${digits}`; // Prepend 91 for India
  }
  return digits;
}

/**
 * Validate receipt data to ensure required fields for the template are present
 * and the donor mobile number is in a correct phone format.
 */
function validateReceiptData(receipt) {
  const errors = [];
  if (!receipt) {
    errors.push('Receipt data is null or undefined');
    return { isValid: false, errors, formattedPhone: '' };
  }
  if (!receipt.receiptNumber) {
    errors.push('Missing receiptNumber');
  }
  if (receipt.amount === undefined || receipt.amount === null) {
    errors.push('Missing amount');
  }
  
  const formattedPhone = formatPhoneNumber(receipt.donorMobile);
  if (!formattedPhone || !/^\d{10,15}$/.test(formattedPhone)) {
    errors.push(`Invalid donorMobile: ${receipt.donorMobile || 'empty'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    formattedPhone
  };
}

/**
 * Helper function to verify media URL is publicly accessible before sending to Meta
 */
async function verifyMediaUrl(url) {
  logger.info(`[Media Verification] Starting validation for URL: ${url}`);
  try {
    const response = await axios.get(url, { 
      headers: { Range: 'bytes=0-10' }, 
      timeout: 5000 
    });
    
    const status = response.status;
    const contentType = response.headers['content-type'] || '';
    const contentRange = response.headers['content-range'] || '';
    let imageSize = response.headers['content-length'] || '0';
    if (contentRange && contentRange.includes('/')) {
      imageSize = contentRange.split('/')[1];
    }

    const validationResult = (status === 200 || status === 206) &&
                             (contentType.startsWith('image/') || contentType.startsWith('application/pdf'));

    // STEP 3: Image Validation Log
    logger.info(`[DIAGNOSTIC] STEP 3 - Image Validation`, {
      receiptImageUrl: url,
      httpStatus: status,
      contentType: contentType,
      imageSize: imageSize,
      validationResult: validationResult ? "SUCCESS" : "FAILED"
    });
    
    if (status !== 200 && status !== 206) {
      throw new Error(`HTTP status is ${status}, expected 200 or 206`);
    }
    
    if (!contentType.startsWith('image/') && !contentType.startsWith('application/pdf')) {
      throw new Error(`Invalid Content-Type: ${contentType}, expected image/ or application/pdf`);
    }
  } catch (error) {
    logger.error(`[DIAGNOSTIC] STEP 3 - Image Validation FAILED`, {
      receiptImageUrl: url,
      httpStatus: error.response ? error.response.status : "N/A",
      contentType: error.response ? (error.response.headers['content-type'] || "N/A") : "N/A",
      imageSize: "N/A",
      validationResult: "FAILED - " + error.message
    });
    throw new Error(`URL is not publicly accessible: ${error.message}`);
  }
}

/**
 * Core function to invoke Meta Cloud API
 */
async function sendWhatsappCore(recipientMobile, templatePayload, secrets) {
  const token = process.env.WHATSAPP_TOKEN || secrets.token;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || secrets.phoneNumberId;

  if (!token || !phoneNumberId) {
    throw new Error('WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured');
  }

  const url = `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const templateName = templatePayload.type === 'template' ? (templatePayload.template?.name || 'Unknown') : 'N/A';
  const language = templatePayload.template?.language?.code || 'N/A';
  
  let headerParameter = 'N/A';
  let bodyParameters = [];
  
  if (templatePayload.template?.components) {
    for (const comp of templatePayload.template.components) {
      if (comp.type === 'header' && comp.parameters) {
        headerParameter = JSON.stringify(comp.parameters);
      }
      if (comp.type === 'body' && comp.parameters) {
        bodyParameters = comp.parameters.map(p => p.text);
      }
    }
  }

  const imageLink = templatePayload.template?.components?.find(c => c.type === 'header')?.parameters?.find(p => p.type === 'image')?.image?.link || 'N/A';

  // STEP 4: Meta Request Log
  logger.info(`[DIAGNOSTIC] STEP 4 - Meta Request Payload`, {
    phoneNumber: recipientMobile,
    templateName: templateName,
    language: language,
    header: headerParameter,
    bodyVariables: bodyParameters,
    imageLink: imageLink,
    completePayload: JSON.stringify(templatePayload)
  });

  try {
    const response = await axios.post(url, templatePayload, {
      headers: headers,
      timeout: 10000 // 10 seconds timeout
    });

    const resData = response.data;
    const messageId = resData.messages && resData.messages[0] ? resData.messages[0].id : '';

    // STEP 5: Meta Response Log (Success)
    logger.info("[TEMPLATE CHECK]", {
      currentWhatsappTemplate,
      templateSent: templatePayload?.template?.name || "N/A",
    });

    logger.info(`[DIAGNOSTIC] STEP 5 - Meta Response (Success)`, {
      httpStatus: response.status,
      headers: JSON.stringify(response.headers),
      body: JSON.stringify(resData),
      errors: null,
      message_id: messageId
    });

    return {
      status: response.status,
      data: resData
    };
  } catch (error) {
    const errorData = error.response ? error.response.data : null;
    const errorStatus = error.response ? error.response.status : null;
    const errorHeaders = error.response ? error.response.headers : null;

    // STEP 5: Meta Response Log (Failure)
    logger.error(`[DIAGNOSTIC] STEP 5 - Meta Response (Failure)`, {
      httpStatus: errorStatus || "N/A",
      headers: errorHeaders ? JSON.stringify(errorHeaders) : "N/A",
      body: errorData ? JSON.stringify(errorData) : "N/A",
      errors: error.message,
      message_id: "N/A"
    });

    if (error.response) {
      error.message = `${error.message} - Meta Response: ${JSON.stringify(errorData)}`;
    }
    throw error;
  }
}

/**
 * Generate a far-future signed download URL for receipt PDF in Firebase Storage
 */
async function generateSignedMediaUrl(receiptId, mediaType = 'image') {
  try {
    const bucket = admin.storage().bucket();
    let filePath;
    if (mediaType === 'pdf') {
      filePath = `receipt_pdfs/${receiptId}.pdf`;
    } else {
      const jpgRef = bucket.file(`receipt_images/${receiptId}.jpg`);
      const [jpgExists] = await jpgRef.exists();
      filePath = jpgExists ? `receipt_images/${receiptId}.jpg` : `receipt_images/${receiptId}.png`;
    }
      
    const file = bucket.file(filePath);
    
    // Call getDownloadURL from firebase-admin/storage to get standard public download URL
    const url = await getDownloadURL(file);
    return url;
  } catch (error) {
    logger.error(`Error generating download URL for ${receiptId} (${mediaType}):`, error);
    const bucketName = admin.storage().bucket().name;
    const filePathEncoded = encodeURIComponent(mediaType === 'pdf' ? `receipt_pdfs/${receiptId}.pdf` : `receipt_images/${receiptId}.jpg`);
    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${filePathEncoded}?alt=media`;
  }
}

/**
 * Atomic transaction lock to prevent duplicate sends.
 * Ensures organizationId is written from the lock initialization to prevent permission issues.
 */
async function acquireLock(receiptId, organizationId, logRef, initialStatus = 'processing') {
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(logRef);
    if (doc.exists) {
      const data = doc.data();
      if (data.textStatus === 'sent' || data.textStatus === 'processing') {
        return { locked: false, data };
      }
      const attemptCount = (data.attemptCount || 0) + 1;
      if (attemptCount > 3) {
        return { locked: false, data: { ...data, maxRetriesReached: true } };
      }
      transaction.update(logRef, {
        textStatus: initialStatus,
        attemptCount: attemptCount,
        organizationId: organizationId || data.organizationId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { locked: true, attemptCount, data };
    } else {
      transaction.set(logRef, {
        receiptId,
        organizationId,
        textStatus: initialStatus,
        attemptCount: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return { locked: true, attemptCount: 1, data: null };
    }
  });
}

/**
 * Core text template delivery logic
 */
async function sendTextCore(receipt, secrets, logRef, attemptCount) {
  const receiptId = receipt.id;

  // 1. Validate receipt data to fail permanently on invalid data and avoid queue pollution
  const validation = validateReceiptData(receipt);
  if (!validation.isValid) {
    const errorMsg = `Validation failed: ${validation.errors.join(', ')}`;
    logger.error(errorMsg);
    await logRef.set({
      receiptId,
      organizationId: receipt.organizationId,
      receiptNumber: receipt.receiptNumber || 'unknown',
      recipientMobile: receipt.donorMobile || 'unknown',
      textStatus: 'permanent_failure',
      textError: errorMsg,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('receipts').doc(receiptId).update({
      whatsappStatus: 'failed'
    });
    return;
  }

  const formattedPhone = validation.formattedPhone;

  try {
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formattedPhone,
      type: "template",
      template: {
        name: "receipt_generated",
        language: {
          code: "mr"
        },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: receipt.donorName || "Guest Donor" },
              { type: "text", text: receipt.receiptNumber },
              { type: "text", text: receipt.amount.toString() },
              { type: "text", text: receipt.organizationName || "PavtiBook" }
            ]
          }
        ]
      }
    };

    // Validate template name and parameters
    if (payload.template.name !== 'receipt_generated') {
      throw new Error(`Invalid template name: ${payload.template.name}`);
    }
    const params = payload.template.components[0].parameters;
    for (let i = 0; i < params.length; i++) {
      if (params[i].type === 'text' && (!params[i].text || params[i].text.toString().trim() === '')) {
        throw new Error(`Template parameter at index ${i} is empty or invalid`);
      }
    }

    const responseResult = await sendWhatsappCore(formattedPhone, payload, secrets);
    const resData = responseResult.data;
    const messageId = resData.messages && resData.messages[0] ? resData.messages[0].id : '';

    const signedPdfUrl = await generateSignedMediaUrl(receiptId, 'pdf');

    // Save success logs
    await logRef.set({
      receiptId,
      organizationId: receipt.organizationId,
      receiptNumber: receipt.receiptNumber,
      recipientMobile: formattedPhone,
      textStatus: 'sent',
      textMessageId: messageId,
      textTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      signedPdfUrl: signedPdfUrl,
      metaResponse: resData,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    // Update receipt status
    await db.collection('receipts').doc(receiptId).update({
      whatsappStatus: 'sent',
      whatsappMessageId: messageId,
      whatsappSentAt: new Date().toISOString()
    });

    // Log usage and cost
    await db.collection('whatsapp_usage').add({
      organizationId: receipt.organizationId,
      receiptId: receiptId,
      messageType: 'text',
      messageId: messageId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      estimatedCost: 0.12
    });

    // Check PDF Auto Send Settings
    const orgDoc = await db.collection('organizations').doc(receipt.organizationId).get();
    const orgData = orgDoc.data() || {};
    const pdfAutoSend = orgData.pdfAutoSend === true || orgData.pdf_auto_send === true;
    if (pdfAutoSend) {
      await sendMediaCore(receipt, secrets, logRef, false);
    }

    return { success: true };

  } catch (error) {
    logger.error(`Text delivery failed for receipt ${receiptId} on attempt ${attemptCount}:`, error);

    let nextAttemptAt = null;
    let finalStatus = 'failed';
    const now = new Date();
    if (attemptCount === 1) {
      nextAttemptAt = new Date(now.getTime() + 30000); // 30 seconds
    } else if (attemptCount === 2) {
      nextAttemptAt = new Date(now.getTime() + 300000); // 5 minutes
    } else {
      finalStatus = 'permanent_failure'; // Exceeded 3 attempts
    }

    await logRef.set({
      receiptId,
      organizationId: receipt.organizationId,
      receiptNumber: receipt.receiptNumber,
      recipientMobile: formattedPhone,
      textStatus: finalStatus,
      nextAttemptAt: nextAttemptAt ? admin.firestore.Timestamp.fromDate(nextAttemptAt) : null,
      textError: error.message,
      metaResponse: error.response ? error.response.data : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('receipts').doc(receiptId).update({
      whatsappStatus: 'failed'
    });

    return { success: false, error: error.message };
  }
}

/**
 * Core Media delivery logic (sends PNG receipt images to WhatsApp)
 */
async function sendMediaCore(receipt, secrets, logRef, force = false, attemptCount = 1, forceMediaType = null) {
  let payload = null;
  const receiptId = receipt.id;
  const formattedPhone = formatPhoneNumber(receipt.donorMobile);

  if (!formattedPhone || !/^\d{10,15}$/.test(formattedPhone)) {
    logger.error(`Invalid donor phone number for media: ${receipt.donorMobile}`);
    await logRef.set({
      whatsappMediaStatus: 'failed',
      whatsappMediaError: `Invalid donor phone number: ${receipt.donorMobile || 'empty'}`,
      whatsappMediaSentAt: admin.firestore.FieldValue.serverTimestamp(),
      whatsappMediaType: 'image',
      mediaAttemptCount: attemptCount
    }, { merge: true });
    return { success: false, error: `Invalid donor phone number: ${receipt.donorMobile || 'empty'}` };
  }

  let activeAttempt = attemptCount;

  if (!force) {
    const isDuplicate = await db.runTransaction(async (transaction) => {
      const logDoc = await transaction.get(logRef);
      if (logDoc.exists) {
        const data = logDoc.data();
        if (data.whatsappMediaStatus === 'sent' || data.whatsappMediaStatus === 'processing') {
          return { locked: false };
        }
        const currentAttempt = (data.mediaAttemptCount || 0) + 1;
        if (currentAttempt > 3) {
          return { locked: false }; // max retries reached
        }
        transaction.update(logRef, {
          whatsappMediaStatus: 'processing',
          mediaAttemptCount: currentAttempt,
          whatsappMediaSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { locked: true, currentAttempt };
      } else {
        transaction.set(logRef, {
          receiptId,
          organizationId: receipt.organizationId,
          whatsappMediaStatus: 'processing',
          mediaAttemptCount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          whatsappMediaSentAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return { locked: true, currentAttempt: 1 };
      }
    });

    if (!isDuplicate.locked) {
      logger.info(`Media send skipped for ${receiptId}: already sent or processing.`);
      return { success: false, error: 'Already sent or processing.' };
    }
    activeAttempt = isDuplicate.currentAttempt;
  } else {
    await logRef.set({
      whatsappMediaStatus: 'processing',
      mediaAttemptCount: 1,
      whatsappMediaSentAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    activeAttempt = 1;
  }

  try {
    const bucket = admin.storage().bucket();
    
    // Determine which file to use
    let usePdf = false;
    if (forceMediaType === 'pdf') {
      usePdf = true;
    } else if (forceMediaType === 'image') {
      usePdf = false;
    } else {
      // Auto-detect
      let imageRef = bucket.file(`receipt_images/${receiptId}.jpg`);
      let [imageExists] = await imageRef.exists();
      if (!imageExists) {
        imageRef = bucket.file(`receipt_images/${receiptId}.png`);
        [imageExists] = await imageRef.exists();
      }
      usePdf = !imageExists;
    }

    // Caption formatting
    const donorName = receipt.donorName || "Ã Â¤Â¦Ã Â¥â€¡Ã Â¤Â£Ã Â¤â€”Ã Â¥â‚¬Ã Â¤Â¦Ã Â¤Â¾Ã Â¤Â°";
    const orgName = receipt.organizationName || "PavtiBook";
    
    const caption = `Ã°Å¸â„¢Â Ã Â¤Â¨Ã Â¤Â®Ã Â¤Â¸Ã Â¥ÂÃ Â¤â€¢Ã Â¤Â¾Ã Â¤Â° ${donorName}\n\nÃ Â¤â€ Ã Â¤ÂªÃ Â¤Â²Ã Â¥â‚¬ Ã¢â€šÂ¹${receipt.amount} Ã Â¤ÂµÃ Â¤Â°Ã Â¥ÂÃ Â¤â€”Ã Â¤Â£Ã Â¥â‚¬ Ã Â¤Â¯Ã Â¤Â¶Ã Â¤Â¸Ã Â¥ÂÃ Â¤ÂµÃ Â¥â‚¬Ã Â¤Â°Ã Â¤Â¿Ã Â¤Â¤Ã Â¥ÂÃ Â¤Â¯Ã Â¤Â¾ Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â°Ã Â¤Â¾Ã Â¤ÂªÃ Â¥ÂÃ Â¤Â¤ Ã Â¤ÂÃ Â¤Â¾Ã Â¤Â²Ã Â¥â‚¬ Ã Â¤â€ Ã Â¤Â¹Ã Â¥â€¡.\n\nÃ°Å¸Â§Â¾ Receipt No:\n${receipt.receiptNumber}\n\nÃ°Å¸Ââ€º Organization:\n${orgName}\n\nÃ Â¤Â§Ã Â¤Â¨Ã Â¥ÂÃ Â¤Â¯Ã Â¤ÂµÃ Â¤Â¾Ã Â¤Â¦.`;


    let payload;
    let signedUrl;
    let mediaType;

    if (!usePdf) {
      signedUrl = await generateSignedMediaUrl(receiptId, 'image');
      mediaType = 'image';
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "template",
        template: {
          name: currentWhatsappTemplate,
          language: {
            code: "mr"
          },
          components: [
            {
              type: "header",
              parameters: [
                {
                  type: "image",
                  image: {
                    link: signedUrl
                  }
                }
              ]
            },
            {
              type: "body",
              parameters: [
                { type: "text", text: receipt.donorName || "Ã Â¤Â¦Ã Â¥â€¡Ã Â¤Â£Ã Â¤â€”Ã Â¥â‚¬Ã Â¤Â¦Ã Â¤Â¾Ã Â¤Â°" }, // {{1}} Donor Name
                { type: "text", text: receipt.receiptNumber },            // {{2}} Receipt Number
                { type: "text", text: receipt.amount.toString() },        // {{3}} Amount
                { type: "text", text: orgName }                          // {{4}} Organization Name
              ]
            }
          ]
        }
      };
    } else {
      signedUrl = await generateSignedMediaUrl(receiptId, 'pdf');
      mediaType = 'pdf';
      payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "document",
        document: {
          link: signedUrl,
          filename: `receipt_${receipt.receiptNumber}.pdf`,
          caption: caption
        }
      };
    }

    // Verify media URL before calling WhatsApp API
    try {
      await verifyMediaUrl(signedUrl);
    } catch (err) {
      // Delete invalid/corrupted upload from Storage so retry flow regenerates it
      try {
        const bucket = admin.storage().bucket();
        const filePath = mediaType === 'pdf' ? `receipt_pdfs/${receiptId}.pdf` : `receipt_images/${receiptId}.jpg`;
        const file = bucket.file(filePath);
        const [exists] = await file.exists();
        if (exists) {
          await file.delete();
          logger.info(`[Media Verification] Deleted invalid/corrupted upload at: ${filePath}`);
        }
      } catch (deleteErr) {
        logger.error(`[Media Verification] Failed to clean up invalid upload: ${deleteErr.message}`);
      }
      throw new Error(`Media validation failed before WhatsApp API send: ${err.message}`);
    }

    const responseResult = await sendWhatsappCore(formattedPhone, payload, secrets);
    const resData = responseResult.data;
    const httpStatus = responseResult.status;

    // STEP 6: Determine Success â€” ALL 5 conditions must pass
    const cond1 = httpStatus === 200;
    const cond2 = !!(resData && resData.messages);
    const cond3 = !!(cond2 && Array.isArray(resData.messages) && resData.messages.length > 0);
    const cond4 = !!(cond3 && resData.messages[0] && resData.messages[0].id);
    const cond5 = !!(cond4 && resData.messages[0].id.trim() !== '');
    const isAllConditionsTrue = cond1 && cond2 && cond3 && cond4 && cond5;
    const messageId = cond5 ? resData.messages[0].id : '';
    const deliveryStatus = (resData.messages && resData.messages[0] && resData.messages[0].message_status) || 'accepted';

    logger.info(`[DIAGNOSTIC] STEP 6 - Success Evaluation`, {
      cond1_httpStatus200: cond1,
      cond2_messagesExists: cond2,
      cond3_messagesNonEmpty: cond3,
      cond4_messageIdExists: cond4,
      cond5_messageIdNonEmpty: cond5,
      finalResult: isAllConditionsTrue ? 'SUCCESS' : 'FAILED',
      messageId: messageId
    });

    // STEP 7: Firestore â€” full audit record
    await logRef.set({
      whatsappMediaStatus: isAllConditionsTrue ? 'sent' : 'failed',
      whatsappMediaMessageId: messageId,
      whatsappMediaSentAt: admin.firestore.FieldValue.serverTimestamp(),
      whatsappMediaUrl: signedUrl,
      whatsappMediaType: mediaType,
      whatsappMediaMetaResponse: resData,
      mediaAttemptCount: activeAttempt,
      requestPayload: payload,
      responsePayload: resData,
      httpStatus: httpStatus,
      messageId: messageId,
      deliveryStatus: isAllConditionsTrue ? deliveryStatus : 'failed',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    if (!isAllConditionsTrue) {
      throw new Error(`STEP 6 FAILED: Meta response did not pass all 5 conditions. Response: ${JSON.stringify(resData)}`);
    }

    await db.collection('receipts').doc(receiptId).update({
      whatsappMediaStatus: 'sent',
      mediaSentAt: admin.firestore.FieldValue.serverTimestamp(),
      mediaRetryCount: activeAttempt - 1
    });

    await db.collection('whatsapp_usage').add({
      organizationId: receipt.organizationId,
      receiptId: receiptId,
      messageType: mediaType,
      messageId: messageId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      estimatedCost: 0.12
    });

    return {
      success: true,
      messageId: messageId,
      mediaType: mediaType,
      deliveryStatus: deliveryStatus
    };

  } catch (error) {
    logger.error(`[sendMediaCore] Image delivery FAILED for receipt ${receiptId} (attempt ${activeAttempt}):`, {
      errorMessage: error.message,
      metaErrorBody: error.response ? JSON.stringify(error.response.data) : null
    });

    // Determine file type for logging
    const bucket = admin.storage().bucket();
    const imageRef = bucket.file(`receipt_images/${receiptId}.jpg`);
    const [imageExists] = await imageRef.exists();
    const mediaType = imageExists ? 'image' : 'pdf';

    // STEP 7: Firestore â€” failure audit record
    await logRef.set({
      whatsappMediaStatus: 'failed',
      whatsappMediaError: error.message,
      whatsappMediaMetaResponse: error.response ? error.response.data : null,
      whatsappMediaSentAt: admin.firestore.FieldValue.serverTimestamp(),
      whatsappMediaType: mediaType,
      mediaNextAttemptAt: null,
      mediaAttemptCount: activeAttempt,
      requestPayload: payload || null,
      responsePayload: error.response ? error.response.data : null,
      httpStatus: error.response ? error.response.status : null,
      messageId: '',
      deliveryStatus: 'failed',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    await db.collection('receipts').doc(receiptId).update({
      whatsappMediaStatus: 'failed',
      mediaRetryCount: activeAttempt,
      mediaSentAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Ã¢â€â‚¬Ã¢â€â‚¬ TEXT FALLBACK Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // Image delivery failed. Immediately fall back to the text-only template
    // (receipt_generated) so the donor always receives at least one message.
    logger.info(`[sendMediaCore] Falling back to text-only template receipt_generated for receipt ${receiptId}`);
    try {
      await sendTextCore(receipt, secrets, logRef, 1);
      logger.info(`[sendMediaCore] Text fallback delivered successfully for receipt ${receiptId}`);
      await logRef.set({ whatsappMediaStatus: 'text_fallback_sent' }, { merge: true });
      await db.collection('receipts').doc(receiptId).update({ whatsappMediaStatus: 'text_fallback_sent' });
    } catch (textErr) {
      logger.error(`[sendMediaCore] Text fallback also failed for receipt ${receiptId}:`, textErr.message);
    }
    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

    return { success: false, error: error.message };
  }
}

// ========================================================
// 2. FIRESTORE TRIGGERS
// ========================================================

/**
 * Async trigger running upon receipt creation.
 * Never blocks client receipt creation.
 */
exports.sendReceiptWhatsapp = onDocumentCreated({
  document: 'receipts/{receiptId}',
  secrets: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
  timeoutSeconds: 60
}, async (event) => {
  const receipt = event.data.data();
  const receiptId = event.params.receiptId;

  if (!receipt) {
    logger.error('No receipt data found.');
    return;
  }
  
  // Inject ID explicitly
  receipt.id = receiptId;

  const secrets = {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  };

  try {
    // 1. Fetch organization settings
    const orgDoc = await db.collection('organizations').doc(receipt.organizationId).get();
    if (!orgDoc.exists) {
      logger.error(`Organization ${receipt.organizationId} does not exist.`);
      return;
    }
    const orgData = orgDoc.data();
    const whatsappAutoSend = orgData.whatsappAutoSend !== false && orgData.whatsapp_auto_send !== false;
    
    const logRef = db.collection('whatsapp_logs').doc(receiptId);

    if (!whatsappAutoSend) {
      logger.info(`WhatsApp auto-send disabled for org ${receipt.organizationId}. Logging skipped.`);
      await logRef.set({
        receiptId,
        organizationId: receipt.organizationId,
        receiptNumber: receipt.receiptNumber,
        recipientMobile: receipt.donorMobile,
        textStatus: 'disabled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return;
    }

    // 2. Try to lock
    const lockResult = await acquireLock(receiptId, receipt.organizationId, logRef);
    if (!lockResult.locked) {
      logger.info(`Text send lock failed for receiptId ${receiptId}. Already processing/sent.`);
      return;
    }

    // Ã¢â€â‚¬Ã¢â€â‚¬ AUTO TEXT SEND DISABLED Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    // WhatsApp delivery is now handled exclusively by sendReceiptMediaWhatsapp
    // (called client-side from the success screen). That function sends the
    // receipt_generated_image template. If image delivery fails, it immediately
    // falls back to the receipt_generated text template via sendTextCore.
    //
    // Sending text here would create a DUPLICATE message every time a receipt
    // is created. This trigger is intentionally disabled.
    // Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
    logger.info(`[sendReceiptWhatsapp] Auto text-send SKIPPED for receipt ${receiptId}. WhatsApp delivery handled by sendReceiptMediaWhatsapp.`);

  } catch (error) {
    logger.error(`sendReceiptWhatsapp trigger general error:`, error);
  }
});

// ========================================================
// 3. SCHEDULED CRON WORKER
// ========================================================

/**
 * Queue processing task running every minute.
 * Recovers failed messages with exponential backoff.
 */
exports.processWhatsappQueue = onSchedule({
  schedule: 'every 1 minutes',
  secrets: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'],
  timeoutSeconds: 60
}, async (event) => {
  const secrets = {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  };

  const now = admin.firestore.Timestamp.now();
  
  // 1. Find text messages that failed and need retry.
  const querySnapshot = await db.collection('whatsapp_logs')
    .where('textStatus', '==', 'failed')
    .where('nextAttemptAt', '<=', now)
    .limit(100)
    .get();

  if (querySnapshot.size > 0) {
    logger.info(`Queue processor found ${querySnapshot.size} failed text messages to process.`);
  }

  for (const doc of querySnapshot.docs) {
    const logData = doc.data();
    const receiptId = logData.receiptId;
    const attemptCount = logData.attemptCount || 0;

    if (attemptCount >= 3) {
      continue;
    }

    try {
      const receiptDoc = await db.collection('receipts').doc(receiptId).get();
      if (!receiptDoc.exists) {
        logger.error(`Receipt ${receiptId} missing. Cancelling queue.`);
        await doc.ref.update({ textStatus: 'permanent_failure', textError: 'Receipt document deleted.' });
        continue;
      }

      const receipt = receiptDoc.data();
      receipt.id = receiptId;

      if (receipt.whatsappStatus === 'sent') {
        logger.info(`Receipt ${receiptId} already has whatsappStatus='sent'. Skipping retry.`);
        await doc.ref.update({ textStatus: 'sent', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        continue;
      }

      const lockResult = await acquireLock(receiptId, receipt.organizationId, doc.ref);
      if (!lockResult.locked) continue;

      await sendTextCore(receipt, secrets, doc.ref, lockResult.attemptCount);

    } catch (err) {
      logger.error(`Queue retry crash for receipt ${receiptId}:`, err);
    }
  }

  // 2. Find media messages that failed and need retry.
  const mediaQuerySnapshot = await db.collection('whatsapp_logs')
    .where('whatsappMediaStatus', '==', 'failed')
    .where('mediaNextAttemptAt', '<=', now)
    .limit(100)
    .get();

  if (mediaQuerySnapshot.size > 0) {
    logger.info(`Queue processor found ${mediaQuerySnapshot.size} failed media messages to process.`);
  }

  for (const doc of mediaQuerySnapshot.docs) {
    const logData = doc.data();
    const receiptId = logData.receiptId;
    const attemptCount = logData.mediaAttemptCount || 0;

    if (attemptCount >= 3) {
      continue;
    }

    try {
      const receiptDoc = await db.collection('receipts').doc(receiptId).get();
      if (!receiptDoc.exists) {
        logger.error(`Receipt ${receiptId} missing for media. Cancelling queue.`);
        await doc.ref.update({ whatsappMediaStatus: 'permanent_failure', whatsappMediaError: 'Receipt document deleted.' });
        continue;
      }

      const receipt = receiptDoc.data();
      receipt.id = receiptId;

      if (logData.whatsappMediaStatus === 'sent') {
        logger.info(`Receipt ${receiptId} already has whatsappMediaStatus='sent'. Skipping retry.`);
        await doc.ref.update({ whatsappMediaStatus: 'sent', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        continue;
      }

      await sendMediaCore(receipt, secrets, doc.ref, false, attemptCount + 1);

    } catch (err) {
      logger.error(`Queue retry crash for media receipt ${receiptId}:`, err);
    }
  }
});

// ========================================================
// 4. CALLABLES
// ========================================================

/**
 * HTTPS Callable: Reset queue counts and retry text template manually.
 */
exports.retryWhatsappSend = onCall({
  secrets: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']
}, async (request) => {
  const { auth } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { receiptId } = request.data;
  if (!receiptId) {
    throw new HttpsError('invalid-argument', 'receiptId is required.');
  }

  const receiptDoc = await db.collection('receipts').doc(receiptId).get();
  if (!receiptDoc.exists) {
    throw new HttpsError('not-found', 'Receipt not found.');
  }
  const receipt = receiptDoc.data();
  receipt.id = receiptId;

  // Organization security check
  const userDoc = await db.collection('users').doc(auth.uid).get();
  const userOrgId = userDoc.data()?.organizationId || userDoc.data()?.organization_id;
  if (userOrgId !== receipt.organizationId) {
    throw new HttpsError('permission-denied', 'User does not belong to the organization.');
  }

  const secrets = {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  };

  const logRef = db.collection('whatsapp_logs').doc(receiptId);

  // Force reset attempts
  await logRef.set({
    textStatus: 'processing',
    attemptCount: 1,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });

  const result = await sendTextCore(receipt, secrets, logRef, 1);
  if (!result.success) {
    throw new HttpsError('internal', `WhatsApp Text delivery failed: ${result.error}`);
  }
  return { success: true };
});

/**
 * HTTPS Callable: Send WhatsApp Media message manually (supports bypass force-sending).
 */
exports.sendReceiptMediaWhatsapp = onCall({
  secrets: ['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID']
}, async (request) => {
  const { auth } = request;
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { receiptId, mediaType } = request.data;
  if (!receiptId) {
    throw new HttpsError('invalid-argument', 'receiptId is required.');
  }

  const receiptDoc = await db.collection('receipts').doc(receiptId).get();
  if (!receiptDoc.exists) {
    throw new HttpsError('not-found', 'Receipt not found.');
  }
  const receipt = receiptDoc.data();
  receipt.id = receiptId;

  // STEP 2: Cloud Function Entry Log
  logger.info(`[DIAGNOSTIC] STEP 2 - Cloud Function Entered`, {
    receiptId: receiptId,
    mobile: receipt.donorMobile,
    template: currentWhatsappTemplate,
    timestamp: new Date().toISOString()
  });

  // Organization security check
  const userDoc = await db.collection('users').doc(auth.uid).get();
  const userOrgId = userDoc.data()?.organizationId || userDoc.data()?.organization_id;
  if (userOrgId !== receipt.organizationId) {
    throw new HttpsError('permission-denied', 'User does not belong to this organization.');
  }

  // Duplicate send protection
  if (receipt.metaMessageId && receipt.deliveryStatus && receipt.deliveryStatus !== 'failed') {
    logger.info(`[sendReceiptMediaWhatsapp] Duplicate send blocked for receipt ${receiptId}. Already has metaMessageId=${receipt.metaMessageId} and deliveryStatus=${receipt.deliveryStatus}`);
    return {
      success: true,
      messageId: receipt.metaMessageId,
      deliveryStatus: receipt.deliveryStatus,
      mediaType: mediaType || 'image',
      alreadySent: true
    };
  }

  const secrets = {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID
  };

  const logRef = db.collection('whatsapp_logs').doc(receiptId);

  const result = await sendMediaCore(receipt, secrets, logRef, true, 1, mediaType);
  if (!result.success) {
    // Return structured failure instead of throwing so Flutter can parse the real reason.
    return {
      success: false,
      messageId: null,
      deliveryStatus: 'failed',
      error: result.error || 'Meta rejected the request. Check Cloud Function logs.'
    };
  }

  // Update metaMessageId and increment totalAccepted
  if (result.messageId) {
    const batch = db.batch();
    const receiptRef = db.collection('receipts').doc(receiptId);
    batch.update(receiptRef, {
      metaMessageId: result.messageId,
      deliveryStatus: 'accepted',
      acceptedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const analyticsRef = db.collection('whatsapp_analytics').doc('global');
    batch.set(analyticsRef, {
      totalAccepted: admin.firestore.FieldValue.increment(1)
    }, { merge: true });

    await batch.commit();
    logger.info(`[sendReceiptMediaWhatsapp] Saved metaMessageId=${result.messageId} to receipt ${receiptId} and updated analytics.`);
  }

  return {
    success: true,
    messageId: result.messageId || '',
    deliveryStatus: result.deliveryStatus || 'accepted',
    mediaType: result.mediaType || 'image'
  };
});

/**
 * HTTPS Callable: Create a Razorpay Order.
 */
exports.createRazorpayOrder = onCall({
  secrets: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
}, async (request) => {
  const { auth } = request;
  if (!auth) {
    logger.warn('Unauthenticated request to createRazorpayOrder.');
    throw new HttpsError('unauthenticated', 'Authentication Required');
  }

  const { amount, orgId, planName } = request.data;
  if (!amount || !orgId || !planName) {
    throw new HttpsError('invalid-argument', 'Missing amount, orgId, or planName.');
  }

  const rawKeyId = process.env.RAZORPAY_KEY_ID;
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET;

  const keyId = rawKeyId ? rawKeyId.trim() : '';
  const keySecret = rawKeySecret ? rawKeySecret.trim() : '';

  if (!keyId || !keySecret) {
    logger.error('Missing Razorpay credentials: KEY_ID or KEY_SECRET is blank or missing.');
    throw new HttpsError('failed-precondition', 'Missing Razorpay credentials.');
  }

  // Print masked Key ID for debugging. Never print Key Secret.
  const maskedKeyId = keyId.length > 8 ? keyId.substring(0, 8) + '...' + keyId.substring(keyId.length - 4) : '***';
  logger.info(`[DEBUG] createRazorpayOrder - Initializing client with Key ID: ${maskedKeyId}`);

  const authHeader = 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64');

  try {
    const response = await axios.post('https://api.razorpay.com/v1/orders', {
      amount: Math.round(amount * 100), // in paise
      currency: 'INR',
      receipt: `order_rcpt_${orgId.substring(0, 10)}_${Date.now().toString().substring(6)}`,
      notes: {
        orgId: orgId,
        planName: planName
      }
    }, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      }
    });

    return {
      orderId: response.data.id,
      amount: response.data.amount,
      currency: response.data.currency,
      subscriptionPlan: planName,
      keyId: keyId
    };
  } catch (error) {
    const errorData = error.response ? error.response.data : null;
    const status = error.response ? error.response.status : null;
    logger.error('Error creating Razorpay order:', {
      status: status,
      errorResponse: errorData,
      message: error.message
    });
    
    let errMsg = error.message;
    if (errorData && errorData.error && errorData.error.description) {
      errMsg = errorData.error.description;
    }
    if (status === 401) {
      errMsg = `Razorpay authentication failed. Stored Key ID might not match Secret. (${errMsg})`;
    }
    throw new HttpsError('internal', `Failed to create Razorpay order: ${errMsg}`);
  }
});

/**
 * HTTPS Callable: Verify Razorpay Payment signature and status, then update database atomically.
 */
exports.verifyRazorpayPayment = onCall({
  secrets: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET']
}, async (request) => {
  const { auth } = request;
  if (!auth) {
    logger.warn('Unauthenticated request to verifyRazorpayPayment.');
    throw new HttpsError('unauthenticated', 'Authentication Required');
  }

  const { paymentId, orderId, signature, orgId, planName, operatorName, oldPlan } = request.data;
  if (!paymentId || !orderId || !signature || !orgId || !planName || !operatorName) {
    throw new HttpsError('invalid-argument', 'Missing payment verification parameters.');
  }

  const rawKeyId = process.env.RAZORPAY_KEY_ID;
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET;

  const keyId = rawKeyId ? rawKeyId.trim() : '';
  const keySecret = rawKeySecret ? rawKeySecret.trim() : '';

  if (!keyId || !keySecret) {
    logger.error('Missing Razorpay credentials: KEY_ID or KEY_SECRET is blank or missing.');
    throw new HttpsError('failed-precondition', 'Missing Razorpay credentials.');
  }

  // Print masked Key ID for debugging. Never print Key Secret.
  const maskedKeyId = keyId.length > 8 ? keyId.substring(0, 8) + '...' + keyId.substring(keyId.length - 4) : '***';
  logger.info(`[DEBUG] verifyRazorpayPayment - Initializing client with Key ID: ${maskedKeyId}`);

  // 1. Signature Verification using Razorpay SDK
  const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
  const isValid = validatePaymentVerification({
    "order_id": orderId,
    "payment_id": paymentId
  }, signature, keySecret);

  if (!isValid) {
    logger.error('Signature verification failed for payment:', { paymentId, orderId });
    throw new HttpsError('permission-denied', 'Razorpay signature verification failed.');
  }

  // 2. Fetch payment details from Razorpay API to confirm capture status and amount
  const authHeader = 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64');
  let paymentDetails;
  try {
    const response = await axios.get(`https://api.razorpay.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': authHeader }
    });
    paymentDetails = response.data;
  } catch (error) {
    const errorData = error.response ? error.response.data : null;
    const status = error.response ? error.response.status : null;
    logger.error('Failed to fetch payment details from Razorpay:', {
      status: status,
      errorResponse: errorData,
      message: error.message
    });
    let errMsg = error.message;
    if (errorData && errorData.error && errorData.error.description) {
      errMsg = errorData.error.description;
    }
    if (status === 401) {
      errMsg = `Razorpay authentication failed. Stored Key ID might not match Secret. (${errMsg})`;
    }
    throw new HttpsError('internal', `Failed to verify payment with Razorpay API: ${errMsg}`);
  }

  // Verify capture status
  if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
    throw new HttpsError('failed-precondition', `Payment status is ${paymentDetails.status}, expected captured or authorized.`);
  }

  // Verify amount matches plan pricing (paise check)
  const actualAmount = paymentDetails.amount / 100;
  let expectedAmount = 99; // Default Monthly
  let receiptLimit = 150;
  let usersLimit = 3;
  let durationDays = 30;

  if (planName === 'yearly') {
    expectedAmount = 999;
    receiptLimit = 2000;
    usersLimit = 10;
    durationDays = 365;
  }

  if (actualAmount < expectedAmount) {
    throw new HttpsError('failed-precondition', `Payment amount Ã¢â€šÂ¹${actualAmount} is less than expected Ã¢â€šÂ¹${expectedAmount}.`);
  }

  // Calculate new renewal date
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + durationDays);
  const renewalDateStr = renewalDate.toISOString();

  // 3. Perform database operations inside a transaction
  try {
    await db.runTransaction(async (transaction) => {
      const subRef = db.collection('subscriptions').doc(orgId);
      const historyRef = db.collection('subscription_history').doc();
      const logRef = db.collection('activity_logs').doc();

      // Read current subscription if it exists
      const subSnapshot = await transaction.get(subRef);
      let currentSubData = subSnapshot.exists ? subSnapshot.data() : null;

      // Determine updated user count or limit
      const currentUsersUsed = currentSubData ? (currentSubData.usersUsed || 1) : 1;

      // Set/Update subscription document
      transaction.set(subRef, {
        id: orgId,
        organizationId: orgId,
        plan: planName,
        receiptsUsed: 0, // Reset receipts count on upgrade/renewal
        receiptLimit: receiptLimit,
        usersUsed: currentUsersUsed,
        usersLimit: usersLimit,
        renewalDate: renewalDateStr,
        createdAt: currentSubData ? (currentSubData.createdAt || new Date().toISOString()) : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Write subscription history document
      transaction.set(historyRef, {
        id: historyRef.id,
        organizationId: orgId,
        oldPlan: oldPlan || 'free_trial',
        newPlan: planName,
        amountPaid: actualAmount,
        receiptLimit: receiptLimit,
        usersLimit: usersLimit,
        activatedAt: new Date().toISOString(),
        expiresAt: renewalDateStr,
        operator: operatorName,
        status: 'success',
        razorpayTransactionId: paymentId,
        razorpayOrderId: orderId,
      });

      // Write activity log document
      transaction.set(logRef, {
        organizationId: orgId,
        userId: auth.uid,
        userName: operatorName,
        userRole: 'owner',
        action: 'Subscription Upgraded',
        details: `Upgraded plan to ${planName} (Paid Ã¢â€šÂ¹${actualAmount}) via Razorpay`,
        timestamp: new Date().toISOString(),
      });
    });

    logger.info(`Successfully verified and updated subscription for organization ${orgId} to ${planName}.`);
    return { success: true };
  } catch (error) {
    logger.error('Error writing transaction to Firestore:', error.message);
    throw new HttpsError('internal', `Payment verified, but failed to update database: ${error.message}`);
  }
});

/**
 * HTTPS onRequest webhook endpoint for WhatsApp Delivery Diagnostics
 */
exports.whatsappWebhook = onRequest({
  region: 'asia-south1'
}, async (req, res) => {
  // â”€â”€ STEP 0: Log every inbound request immediately â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  logger.info('[Webhook] â–¶ Inbound request', {
    method: req.method,
    url: req.url,
    headers: JSON.stringify(req.headers),
    bodyType: typeof req.body,
    bodyPreview: JSON.stringify(req.body).substring(0, 500)
  });

  // GET validation
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.info('[Webhook] GET handshake', { mode, token, challenge });

    if (mode === 'subscribe' && token === 'pavtibook_verify_token') {
      logger.info('[Webhook] Handshake successful');
      res.status(200).send(challenge);
    } else {
      logger.warn('[Webhook] Handshake failed: invalid token');
      res.sendStatus(403);
    }
    return;
  }

  // POST webhook callbacks
  if (req.method === 'POST') {
    // Always respond 200 immediately so Meta does not retry
    res.sendStatus(200);

    try {
      const payload = req.body;

      // â”€â”€ STEP 1: Full payload dump â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
      logger.info('[Webhook] STEP 1 - Full payload received', JSON.stringify(payload));

      if (!payload || payload.object !== 'whatsapp_business_account') {
        logger.warn('[Webhook] STEP 1 - Payload is not whatsapp_business_account. object=' + (payload && payload.object));
        return;
      }

      if (!payload.entry || payload.entry.length === 0) {
        logger.warn('[Webhook] STEP 1 - No entries in payload');
        return;
      }

      for (const entry of payload.entry) {
        logger.info('[Webhook] STEP 2 - Processing entry', { entryId: entry.id });

        if (!entry.changes || entry.changes.length === 0) {
          logger.warn('[Webhook] STEP 2 - No changes in entry');
          continue;
        }

        for (const change of entry.changes) {
          const { field, value } = change;
          logger.info('[Webhook] STEP 3 - Change field', { field, hasValue: !!value, hasStatuses: !!(value && value.statuses), statusCount: value && value.statuses ? value.statuses.length : 0 });

          if (field === 'messages') {
            if (!value.statuses || value.statuses.length === 0) {
              logger.info('[Webhook] STEP 3 - No statuses in this change (may be an inbound message event)');
              continue;
            }

            for (const statusObj of value.statuses) {
              const messageId = statusObj.id;
              const status = statusObj.status; // sent, delivered, read, failed, accepted
              const timestampStr = statusObj.timestamp
                ? new Date(parseInt(statusObj.timestamp) * 1000).toISOString()
                : new Date().toISOString();
              const recipient = statusObj.recipient_id || '';
              const conversation = statusObj.conversation || null;
              const pricing = statusObj.pricing || null;
              const errors = statusObj.errors || null;

              // â”€â”€ STEP 4: Log received messageId and status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
              logger.info(`[Webhook] STEP 4 - Status callback received`, {
                receivedMessageId: messageId,
                status,
                recipient,
                timestamp: timestampStr
              });

              // Skip Meta's own 'accepted' status â€” it just means they queued it
              if (status === 'accepted') {
                logger.info(`[Webhook] STEP 4 - status='accepted' from Meta is informational only. No Firestore update needed.`);
                continue;
              }

              // â”€â”€ STEP 5: Idempotent delivery log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
              const logRef = db.collection('whatsapp_delivery_logs').doc(messageId);

              const isNewStatus = await db.runTransaction(async (transaction) => {
                const logSnap = await transaction.get(logRef);
                let existingStatuses = [];
                if (logSnap.exists) {
                  existingStatuses = logSnap.data().processedStatuses || [];
                }

                if (existingStatuses.includes(status)) {
                  return false;
                }

                existingStatuses.push(status);
                transaction.set(logRef, {
                  messageId,
                  status,
                  timestamp: timestampStr,
                  recipient,
                  errors,
                  conversation,
                  pricing,
                  rawPayload: payload,
                  processedStatuses: existingStatuses,
                  lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                return true;
              });

              if (!isNewStatus) {
                logger.info(`[Webhook] STEP 5 - Status '${status}' for messageId ${messageId} already processed. Skipping duplicate.`);
                continue;
              }

              // â”€â”€ STEP 6: Find receipt by metaMessageId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
              logger.info(`[Webhook] STEP 6 - Querying receipts where metaMessageId == '${messageId}'`);
              const receiptsRef = db.collection('receipts');
              let receiptDoc = null;
              let receiptId = null;
              let receiptData = null;

              const querySnapshot = await receiptsRef.where('metaMessageId', '==', messageId).limit(1).get();
              logger.info(`[Webhook] STEP 6 - Direct metaMessageId query result: found=${!querySnapshot.empty}, count=${querySnapshot.size}`);

              if (!querySnapshot.empty) {
                receiptDoc = querySnapshot.docs[0];
                receiptId = receiptDoc.id;
                receiptData = receiptDoc.data();
                logger.info(`[Webhook] STEP 6 - âœ… Direct match found. receiptId=${receiptId}`, {
                  storedMetaMessageId: receiptData.metaMessageId,
                  previousDeliveryStatus: receiptData.deliveryStatus
                });
              } else {
                // â”€â”€ STEP 7: Fallback to whatsapp_logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                logger.info(`[Webhook] STEP 7 - No direct match. Trying fallback via whatsapp_logs for messageId=${messageId}`);

                let logReceiptId = null;

                const logsQuery = await db.collection('whatsapp_logs').where('whatsappMediaMessageId', '==', messageId).limit(1).get();
                logger.info(`[Webhook] STEP 7 - whatsappMediaMessageId lookup: found=${!logsQuery.empty}`);

                if (!logsQuery.empty) {
                  logReceiptId = logsQuery.docs[0].id;
                  logger.info(`[Webhook] STEP 7 - Fallback match via whatsappMediaMessageId. logReceiptId=${logReceiptId}`);
                } else {
                  const logsQuery2 = await db.collection('whatsapp_logs').where('messageId', '==', messageId).limit(1).get();
                  logger.info(`[Webhook] STEP 7 - messageId lookup: found=${!logsQuery2.empty}`);

                  if (!logsQuery2.empty) {
                    logReceiptId = logsQuery2.docs[0].id;
                    logger.info(`[Webhook] STEP 7 - Fallback match via messageId. logReceiptId=${logReceiptId}`);
                  }
                }

                if (logReceiptId) {
                  const directDoc = await receiptsRef.doc(logReceiptId).get();
                  if (directDoc.exists) {
                    receiptDoc = directDoc;
                    receiptId = directDoc.id;
                    receiptData = directDoc.data();
                    // Self-heal
                    await receiptsRef.doc(receiptId).update({ metaMessageId: messageId });
                    logger.info(`[Webhook] STEP 7 - âœ… Fallback resolved receiptId=${receiptId}. Healed metaMessageId.`, {
                      previousDeliveryStatus: receiptData.deliveryStatus
                    });
                  }
                } else {
                  logger.error(`[Webhook] STEP 7 - âŒ No receipt found in whatsapp_logs for messageId=${messageId}`);
                }
              }

              // â”€â”€ STEP 8: Update Firestore â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
              if (receiptDoc) {
                const previousStatus = receiptData.deliveryStatus || 'unknown';
                const updateData = {
                  deliveryStatus: status,
                  lastWebhookAt: admin.firestore.FieldValue.serverTimestamp()
                };

                if (status === 'sent') {
                  updateData.sentAt = timestampStr;
                } else if (status === 'delivered') {
                  updateData.deliveredAt = timestampStr;
                } else if (status === 'read') {
                  updateData.readAt = timestampStr;
                } else if (status === 'failed') {
                  updateData.failedAt = timestampStr;
                  if (errors && errors.length > 0) {
                    const err = errors[0];
                    updateData.errorCode = err.code || null;
                    updateData.errorSubcode = err.error_data?.error_subcode || null;
                    updateData.errorTitle = err.title || null;
                    updateData.errorMessage = err.message || err.title || 'Unknown Meta error';
                    updateData.fbTraceId = err.fbtrace_id || null;
                  }
                  updateData.rawWebhookPayload = payload;
                }

                logger.info(`[Webhook] STEP 8 - Updating Firestore receipt`, {
                  receiptId,
                  previousDeliveryStatus: previousStatus,
                  newDeliveryStatus: status,
                  updateFields: Object.keys(updateData)
                });

                await receiptsRef.doc(receiptId).update(updateData);
                logger.info(`[Webhook] STEP 8 - âœ… Firestore update SUCCESS. receiptId=${receiptId} deliveryStatus: ${previousStatus} â†’ ${status}`);

                // â”€â”€ STEP 9: Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                const analyticsRef = db.collection('whatsapp_analytics').doc('global');
                const incrementField = status === 'sent' ? 'totalSent'
                  : status === 'delivered' ? 'totalDelivered'
                  : status === 'read' ? 'totalRead'
                  : status === 'failed' ? 'totalFailed' : null;

                if (incrementField) {
                  const timestampDate = new Date(timestampStr);
                  await db.runTransaction(async (transaction) => {
                    const analyticsSnap = await transaction.get(analyticsRef);
                    const analyticsData = analyticsSnap.exists ? analyticsSnap.data() : {};

                    const updatePayload = {
                      [incrementField]: admin.firestore.FieldValue.increment(1)
                    };

                    if (status === 'delivered' && receiptData.acceptedAt) {
                      const acceptedTime = receiptData.acceptedAt.toDate
                        ? receiptData.acceptedAt.toDate().getTime()
                        : new Date(receiptData.acceptedAt).getTime();
                      const deliveryTimeMs = timestampDate.getTime() - acceptedTime;
                      if (deliveryTimeMs > 0) {
                        const prevAverage = analyticsData.AverageDeliveryTime || 0;
                        const prevDeliveredCount = analyticsData.totalDelivered || 0;
                        updatePayload.AverageDeliveryTime = ((prevAverage * prevDeliveredCount) + deliveryTimeMs) / (prevDeliveredCount + 1);
                      }
                    }

                    transaction.set(analyticsRef, updatePayload, { merge: true });
                  });
                }
              } else {
                logger.error(`[Webhook] STEP 8 - âŒ Cannot update Firestore. No receipt matched messageId=${messageId}`);
              }
            }
          } else if (field === 'message_template_status_update' || field === 'message_template_quality_update' || field === 'account_alerts') {
            await db.collection('whatsapp_delivery_logs').add({
              field,
              value,
              timestamp: new Date().toISOString(),
              rawPayload: payload
            });
            logger.info(`[Webhook] Logged template/account update of type: ${field}`);
          } else {
            logger.info(`[Webhook] Unhandled field type: ${field}`);
          }
        }
      }
    } catch (err) {
      logger.error('[Webhook] âŒ Uncaught error processing webhook event:', err.message, err.stack);
    }
    return;
  }

  res.sendStatus(405);
});

