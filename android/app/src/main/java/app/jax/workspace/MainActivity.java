package app.jax.workspace;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceResponse;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.EditText;
import android.widget.Toast;
import java.util.Arrays;
import java.net.URI;
import java.net.URL;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import java.util.Iterator;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.HttpsURLConnection;
import org.json.JSONObject;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

public final class MainActivity extends Activity {
    private WebView web;
    private PermissionRequest audioRequest;
    private ValueCallback<Uri[]> fileRequest;
    private boolean awaitingAudioPermission;
    private final Uri home = Uri.parse("https://appassets.androidplatform.net/index.html");
    private final ExecutorService network = Executors.newFixedThreadPool(2);
    private WebViewAssetLoader assets;
    private static final int AUDIO = 10;
    private static final int FILE = 11;

    private int port(Uri uri) { return uri.getPort() == -1 ? 443 : uri.getPort(); }
    private boolean trusted(Uri uri) {
        return home != null && "https".equalsIgnoreCase(uri.getScheme()) && home.getHost().equalsIgnoreCase(uri.getHost()) && port(uri) == port(home) && uri.getUserInfo() == null;
    }
    private static final Set<String> API_HOSTS = new HashSet<>(Arrays.asList("api.openai.com", "generativelanguage.googleapis.com", "openrouter.ai", "api.anthropic.com", "api.groq.com", "api.deepseek.com", "api.search.brave.com", "api.tavily.com", "www.googleapis.com"));
    private void nativeRequest(String raw, androidx.webkit.JavaScriptReplyProxy reply) {
        String id = "";
        try {
            if (raw.length() > 120000) throw new IllegalArgumentException("Pedido muito grande.");
            JSONObject request = new JSONObject(raw);
            id = request.optString("id", "");
            final String requestId = id;
            String urlText = request.optString("url", "");
            URI uri = new URI(urlText);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || !API_HOSTS.contains(uri.getHost()) || uri.getUserInfo() != null || uri.getFragment() != null) throw new IllegalArgumentException("Destino não autorizado.");
            String method = request.optString("method", "GET");
            if (!"GET".equals(method) && !"POST".equals(method)) throw new IllegalArgumentException("Método não autorizado.");
            network.execute(() -> {
                JSONObject result = new JSONObject();
                HttpsURLConnection connection = null;
                try {
                    result.put("id", requestId);
                    connection = (HttpsURLConnection) new URL(urlText).openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(12000);
                    connection.setReadTimeout(30000);
                    connection.setRequestMethod(method);
                    JSONObject headers = request.optJSONObject("headers");
                    if (headers != null) {
                        Set<String> allowed = new HashSet<>(Arrays.asList("authorization", "content-type", "x-api-key", "x-goog-api-key", "anthropic-version", "x-title", "accept", "x-subscription-token"));
                        Iterator<String> names = headers.keys();
                        while (names.hasNext()) { String name = names.next(); if (allowed.contains(name.toLowerCase(java.util.Locale.ROOT))) connection.setRequestProperty(name, headers.optString(name)); }
                    }
                    if ("POST".equals(method)) {
                        byte[] payload = request.optString("body", "").getBytes(StandardCharsets.UTF_8);
                        if (payload.length > 100000) throw new IllegalArgumentException("Corpo muito grande.");
                        connection.setDoOutput(true);
                        try (OutputStream output = connection.getOutputStream()) { output.write(payload); }
                    }
                    int status = connection.getResponseCode();
                    InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                    if (input != null) try (InputStream stream = input) {
                        byte[] buffer = new byte[8192]; int n;
                        while ((n = stream.read(buffer)) != -1) { if (bytes.size() + n > 2000000) throw new IllegalArgumentException("Resposta muito grande."); bytes.write(buffer, 0, n); }
                    }
                    result.put("status", status);
                    result.put("body", bytes.toString("UTF-8"));
                } catch (Exception error) { try { result.put("status", 599); result.put("body", "{\"error\":\"Falha de rede ou destino não autorizado.\"}"); } catch (Exception ignored) {} }
                finally { if (connection != null) connection.disconnect(); }
                reply.postMessage(result.toString());
            });
        } catch (Exception error) { try { JSONObject result = new JSONObject(); result.put("id", id); result.put("status", 400); result.put("body", "{\"error\":\"Pedido inválido.\"}"); reply.postMessage(result.toString()); } catch (Exception ignored) {} }
    }
    private void openExternal(Uri uri) {
        String scheme = uri.getScheme();
        if (!("https".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme))) return;
        new AlertDialog.Builder(this).setTitle("Abrir fora do JAX?").setMessage(uri.toString())
            .setNegativeButton("Cancelar", null).setPositiveButton("Abrir", (dialog, which) -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                catch (ActivityNotFoundException error) { Toast.makeText(this, "Nenhum aplicativo disponível para esse link.", Toast.LENGTH_LONG).show(); }
            }).show();
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(8, 12, 18));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        Button browser = new Button(this);
        browser.setText("JAX offline na interface · internet para IA");
        browser.setTextSize(12);
        browser.setEnabled(false);
        root.addView(browser, new LinearLayout.LayoutParams(-1, -2));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(8, 12, 18));
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        setContentView(root);
        root.requestApplyInsets();
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        assets = new WebViewAssetLoader.Builder().setDomain("appassets.androidplatform.net").addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "jaxNative", new HashSet<>(Arrays.asList("https://appassets.androidplatform.net")), (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                if (isMainFrame && message.getData() != null) nativeRequest(message.getData(), replyProxy);
            });
        }
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return assets.shouldInterceptRequest(request.getUrl()); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                if (trusted(request.getUrl())) return false;
                if (request.hasGesture()) openExternal(request.getUrl());
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, Message result) {
                if (!gesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView child, WebResourceRequest request) {
                        openExternal(request.getUrl());
                        child.post(child::destroy);
                        return true;
                    }
                });
                ((WebView.WebViewTransport) result.obj).setWebView(popup);
                result.sendToTarget();
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                if (!trusted(request.getOrigin()) || !Arrays.asList(request.getResources()).contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE) || !hasWindowFocus()) { request.deny(); return; }
                if (audioRequest != null) audioRequest.deny();
                audioRequest = request;
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) confirmAudio();
                else { awaitingAudioPermission = true; requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO); }
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) { if (audioRequest == request) audioRequest = null; }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileRequest != null) fileRequest.onReceiveValue(null);
                fileRequest = callback;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
                picker.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/png", "image/jpeg", "image/webp", "text/plain", "application/json", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
                try { startActivityForResult(picker, FILE); }
                catch (ActivityNotFoundException error) { callback.onReceiveValue(null); fileRequest = null; }
                return true;
            }
        });
        if (Build.VERSION.SDK_INT >= 33) getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::goBack);
        web.loadUrl(home.toString());
    }
    private void confirmAudio() {
        PermissionRequest request = audioRequest;
        if (request == null) return;
        new AlertDialog.Builder(this).setTitle("Permitir microfone ao JAX?")
            .setMessage("Somente em primeiro plano, para esta sessão. Isso não garante reconhecimento de voz no WebView.")
            .setNegativeButton("Negar", (dialog, which) -> { if (audioRequest == request) { request.deny(); audioRequest = null; } })
            .setPositiveButton("Permitir", (dialog, which) -> { if (audioRequest == request) { request.grant(new String[]{PermissionRequest.RESOURCE_AUDIO_CAPTURE}); audioRequest = null; } })
            .setOnCancelListener(dialog -> { if (audioRequest == request) { request.deny(); audioRequest = null; } }).show();
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code != AUDIO) return;
        awaitingAudioPermission = false;
        if (audioRequest == null) return;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED && !isFinishing()) confirmAudio();
        else { audioRequest.deny(); audioRequest = null; }
    }
    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code != FILE || fileRequest == null) return;
        Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
        fileRequest.onReceiveValue(uri != null && "content".equals(uri.getScheme()) ? new Uri[]{uri} : null);
        fileRequest = null;
    }
    private void goBack() { if (web.canGoBack()) web.goBack(); else finish(); }
    @Override public void onBackPressed() { goBack(); }
    @Override protected void onPause() {
        if (audioRequest != null && !awaitingAudioPermission) { audioRequest.deny(); audioRequest = null; }
        web.onPause();
        super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (audioRequest != null) audioRequest.deny();
        if (fileRequest != null) fileRequest.onReceiveValue(null);
        web.stopLoading();
        web.destroy();
        network.shutdownNow();
        super.onDestroy();
    }
}
