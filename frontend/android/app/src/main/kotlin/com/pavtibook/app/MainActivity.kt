package com.pavtibook.app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import android.content.Intent
import android.net.Uri
import androidx.core.content.FileProvider
import java.io.File
import android.content.ActivityNotFoundException

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.pavtibook.app/whatsapp_share"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "shareToWhatsAppDirect" -> {
                    val filePath = call.argument<String>("filePath")
                    val phoneNumber = call.argument<String>("phoneNumber")
                    val text = call.argument<String>("text")

                    if (filePath == null || phoneNumber == null) {
                        result.error("INVALID_ARGUMENTS", "File path and phone number must not be null", null)
                        return@setMethodCallHandler
                    }

                    val success = shareToWhatsAppDirect(filePath, phoneNumber, text)
                    result.success(success)
                }
                "openFile" -> {
                    val filePath = call.argument<String>("filePath")
                    if (filePath == null) {
                        result.error("INVALID_ARGUMENTS", "File path must not be null", null)
                        return@setMethodCallHandler
                    }
                    val success = openFile(filePath)
                    result.success(success)
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun shareToWhatsAppDirect(filePath: String, phoneNumber: String, text: String?): Boolean {
        println("MainActivity: [shareToWhatsAppDirect] Start direct share to $phoneNumber")
        val file = File(filePath)
        if (!file.exists()) {
            println("MainActivity: [shareToWhatsAppDirect] File does not exist at $filePath")
            return false
        }
        println("MainActivity: [shareToWhatsAppDirect] File size: ${file.length()} bytes")

        val authority = "com.pavtibook.app.fileprovider"
        val fileUri: Uri = try {
            val uri = FileProvider.getUriForFile(context, authority, file)
            println("MainActivity: [shareToWhatsAppDirect] FileProvider URI generated successfully: $uri")
            uri
        } catch (e: Exception) {
            println("MainActivity: [shareToWhatsAppDirect] FileProvider failed with authority '$authority'. Error: ${e.message}")
            e.printStackTrace()
            return false
        }

        // Determine exact MIME type — 'image/*' wildcard breaks WhatsApp on Android 12+
        val mimeType = when {
            filePath.endsWith(".pdf", ignoreCase = true) -> "application/pdf"
            filePath.endsWith(".jpg", ignoreCase = true) || filePath.endsWith(".jpeg", ignoreCase = true) -> "image/jpeg"
            filePath.endsWith(".png", ignoreCase = true) -> "image/png"
            else -> "image/jpeg"
        }
        println("MainActivity: [shareToWhatsAppDirect] Using MIME type: $mimeType")

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, fileUri)
            clipData = android.content.ClipData.newRawUri("receipt", fileUri)
            putExtra("jid", "$phoneNumber@s.whatsapp.net")
            if (text != null) {
                putExtra(Intent.EXTRA_TEXT, text)
            }
            setPackage("com.whatsapp")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        println("MainActivity: [shareToWhatsAppDirect] Launching intent for com.whatsapp...")
        return try {
            startActivity(intent)
            println("MainActivity: [shareToWhatsAppDirect] Intent launched successfully for com.whatsapp")
            true
        } catch (e: ActivityNotFoundException) {
            println("MainActivity: [shareToWhatsAppDirect] ActivityNotFoundException for com.whatsapp. Trying com.whatsapp.w4b...")
            intent.setPackage("com.whatsapp.w4b")
            try {
                startActivity(intent)
                println("MainActivity: [shareToWhatsAppDirect] Intent launched successfully for com.whatsapp.w4b")
                true
            } catch (e2: ActivityNotFoundException) {
                println("MainActivity: [shareToWhatsAppDirect] ActivityNotFoundException for com.whatsapp.w4b. Direct sharing failed.")
                false
            }
        } catch (e: Exception) {
            println("MainActivity: [shareToWhatsAppDirect] Unexpected exception when launching intent: ${e.message}")
            e.printStackTrace()
            false
        }
    }

    private fun openFile(filePath: String): Boolean {
        println("MainActivity: [openFile] Start opening file: $filePath")
        val file = File(filePath)
        if (!file.exists()) {
            println("MainActivity: [openFile] File does not exist")
            return false
        }

        val authority = "com.pavtibook.app.fileprovider"
        val fileUri: Uri = try {
            val uri = FileProvider.getUriForFile(context, authority, file)
            println("MainActivity: [openFile] FileProvider URI generated: $uri")
            uri
        } catch (e: Exception) {
            println("MainActivity: [openFile] FileProvider failed with authority '$authority'. Error: ${e.message}")
            e.printStackTrace()
            return false
        }

        val mimeType = when {
            filePath.endsWith(".pdf", ignoreCase = true) -> "application/pdf"
            filePath.endsWith(".jpg", ignoreCase = true) || filePath.endsWith(".jpeg", ignoreCase = true) -> "image/jpeg"
            filePath.endsWith(".png", ignoreCase = true) -> "image/png"
            else -> "image/jpeg"
        }
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(fileUri, mimeType)
            clipData = android.content.ClipData.newRawUri("receipt", fileUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        return try {
            startActivity(intent)
            println("MainActivity: [openFile] Intent launched successfully")
            true
        } catch (e: ActivityNotFoundException) {
            println("MainActivity: [openFile] ActivityNotFoundException: No handler found for $mimeType")
            false
        } catch (e: Exception) {
            println("MainActivity: [openFile] Unexpected error: ${e.message}")
            e.printStackTrace()
            false
        }
    }
}
