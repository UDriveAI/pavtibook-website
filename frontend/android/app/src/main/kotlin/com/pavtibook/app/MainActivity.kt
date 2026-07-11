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
        val file = File(filePath)
        if (!file.exists()) return false

        val fileUri: Uri = try {
            FileProvider.getUriForFile(context, "com.pavtibook.app.fileprovider", file)
        } catch (e: Exception) {
            return false
        }

        // Standard WhatsApp
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = if (filePath.endsWith(".pdf", ignoreCase = true)) "application/pdf" else "image/*"
            putExtra(Intent.EXTRA_STREAM, fileUri)
            putExtra("jid", "$phoneNumber@s.whatsapp.net")
            if (text != null) {
                putExtra(Intent.EXTRA_TEXT, text)
            }
            setPackage("com.whatsapp")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        return try {
            startActivity(intent)
            true
        } catch (e: ActivityNotFoundException) {
            // Try WhatsApp Business
            intent.setPackage("com.whatsapp.w4b")
            try {
                startActivity(intent)
                true
            } catch (e2: ActivityNotFoundException) {
                false
            }
        }
    }

    private fun openFile(filePath: String): Boolean {
        val file = File(filePath)
        if (!file.exists()) return false

        val fileUri: Uri = try {
            FileProvider.getUriForFile(context, "com.pavtibook.app.fileprovider", file)
        } catch (e: Exception) {
            return false
        }

        val mimeType = if (filePath.endsWith(".pdf", ignoreCase = true)) "application/pdf" else "image/*"
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(fileUri, mimeType)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }

        return try {
            startActivity(intent)
            true
        } catch (e: ActivityNotFoundException) {
            false
        }
    }
}
