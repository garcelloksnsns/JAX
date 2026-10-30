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
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.EditText;
import android.widget.Toast;
import java.util.Arrays;
import java.net.URI;

public final class MainActivity extends Activity {
    private WebView web;
    private PermissionRequest audioRequest;
    private ValueCallback<Uri[]> fileRequest;
    private boolean awaitingAudioPermission;
    private Uri home;
    private static final int AUDIO = 10;
    private static final int FILE = 11;

    private int port(Uri uri) { return uri.getPort() == -1 ? 443 : uri.getPort(); }
    private boolean trusted(Uri uri) {
        return home != null && "https".equalsIgnoreCase(uri.getScheme()) && home.getHost().equalsIgnoreCase(uri.getHost()) && port(uri) == port(home) && uri.getUserInfo() == null;
    }
    private Uri validHome(String value) {
        try {
            URI parsed = new URI(value.trim());
            if (!"https".equalsIgnoreCase(parsed.getScheme()) || parsed.getHost() == null || parsed.getUserInfo() != null || parsed.getQuery() != null || parsed.getFragment() != null) return null;
            return Uri.parse(parsed.toString());
        } catch (Exception ignored) { return null; }
    }
    private void configureHome() {
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        input.setHint("https://seu-jax-publicado.example/");
        if (home != null) input.setText(home.toString());
        new AlertDialog.Builder(this).setTitle("URL HTTPS do JAX")
            .setMessage("Informe a URL onde o JAX está publicado. O APK precisa de conexão com esse servidor.")
            .setView(input).setNegativeButton("Cancelar", null)
            .setPositiveButton("Salvar", (dialog, which) -> {
                Uri selected = validHome(input.getText().toString());
                if (selected == null) { Toast.makeText(this, "Informe uma URL HTTPS sem usuário, senha, query ou fragmento.", Toast.LENGTH_LONG).show(); configureHome(); return; }
                home = selected;
                getPreferences(0).edit().putString("app_url", selected.toString()).apply();
                web.loadUrl(selected.toString());
            }).show();
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
        home = validHome(getPreferences(0).getString("app_url", BuildConfig.APP_URL));
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
        browser.setText("Abrir no navegador · melhor suporte à voz");
        browser.setTextSize(12);
        browser.setOnClickListener(view -> { if (home != null) openExternal(home); else configureHome(); });
        root.addView(browser, new LinearLayout.LayoutParams(-1, -2));
        Button configure = new Button(this);
        configure.setText("Configurar URL do JAX");
        configure.setTextSize(12);
        configure.setOnClickListener(view -> configureHome());
        root.addView(configure, new LinearLayout.LayoutParams(-1, -2));
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
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.setWebViewClient(new WebViewClient() {
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
        if (home != null) web.loadUrl(home.toString()); else configureHome();
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
        super.onDestroy();
    }
}
