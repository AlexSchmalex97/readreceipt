//
//  ContentView.swift
//  ReadReceiptApp
//
//  Created by Alexandra Ramirez on 10/13/25.
//

import SwiftUI
import WebKit
import Combine

struct ContentView: View {
    @StateObject private var webViewState = WebViewState()
    
    var body: some View {
        ZStack(alignment: .top) {
            // WebView
            WebView(url: URL(string: "https://readreceiptapp.com")!, state: webViewState)
                .edgesIgnoringSafeArea(.all)
                .opacity(webViewState.isLoading ? 0 : 1)
            
            // Loading animation
            if webViewState.isLoading {
                VStack {
                    Spacer()
                    BookLoadingAnimation()
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(red: 0.96, green: 0.95, blue: 0.94))
            }
            
            // Header that fades based on scroll (only on home page)
            if webViewState.isHomePage && !webViewState.isLoading {
                HStack {
                    Spacer()
                    Image("ReadReceiptHeader")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(height: 56)
                    Spacer()
                }
                .padding(.vertical, 6)
                .background(Color(red: 0.96, green: 0.95, blue: 0.94))
                .opacity(webViewState.headerOpacity)
                .allowsHitTesting(false)
            }
        }
    }
}

// Book-like page flipping animation inspired by provided GIF
struct BookLoadingAnimation: View {
    @State private var flip: Double = 0
    @State private var bounce: CGFloat = 0
    
    var body: some View {
        VStack(spacing: 20) {
            ZStack {
                // Subtle base shadow
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.black.opacity(0.05))
                    .frame(width: 180, height: 120)
                    .blur(radius: 10)
                    .offset(y: 30)
                
                // Book base with pages
                ZStack {
                    // Back cover
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(red: 0.28, green: 0.20, blue: 0.14))
                        .frame(width: 160, height: 110)
                        .shadow(color: Color.black.opacity(0.2), radius: 12, x: 0, y: 8)
                    
                    // Right static pages
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(red: 0.94, green: 0.92, blue: 0.88))
                        .frame(width: 140, height: 100)
                        .offset(x: 18)
                    
                    // Left static pages
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color(red: 0.96, green: 0.94, blue: 0.90))
                        .frame(width: 140, height: 100)
                        .offset(x: -18)
                    
                    // Flipping page with lines
                    FlippingPage(flip: flip)
                        .frame(width: 140, height: 100)
                        .offset(x: -8)
                }
                .rotation3DEffect(.degrees(8), axis: (x: 1, y: 0, z: 0))
                .offset(y: bounce)
            }
            
            Text("Loading...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(red: 0.45, green: 0.35, blue: 0.25))
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: false)) {
                flip = 360
            }
            withAnimation(.easeInOut(duration: 1.6).repeatForever(autoreverses: true)) {
                bounce = -8
            }
        }
    }
}

struct FlippingPage: View {
    var flip: Double
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(Color(red: 0.98, green: 0.97, blue: 0.94))
                .overlay(
                    VStack(spacing: 6) {
                        ForEach(0..<6) { _ in
                            RoundedRectangle(cornerRadius: 1)
                                .fill(Color.black.opacity(0.08))
                                .frame(height: 3)
                        }
                    }
                    .padding(.horizontal, 24)
                )
                .rotation3DEffect(
                    .degrees(flip),
                    axis: (x: 0, y: 1, z: 0),
                    anchor: .leading,
                    perspective: 0.7
                )
                .shadow(color: Color.black.opacity(0.18), radius: 10, x: 0, y: 6)
                .mask(
                    LinearGradient(
                        gradient: Gradient(colors: [Color.black, Color.black, Color.clear]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
        }
    }
}


class WebViewState: ObservableObject {
    @Published var isHomePage = true
    @Published var headerOpacity: Double = 1.0
    @Published var scrollOffset: CGFloat = 0
    @Published var isLoading = true
    
    func updateScrollOffset(_ offset: CGFloat) {
        scrollOffset = offset
        
        // Fade header between 0 and 150 pixels of scroll
        let fadeStart: CGFloat = 0
        let fadeEnd: CGFloat = 150
        
        if offset <= fadeStart {
            headerOpacity = 1.0
        } else if offset >= fadeEnd {
            headerOpacity = 0.0
        } else {
            headerOpacity = 1.0 - Double((offset - fadeStart) / (fadeEnd - fadeStart))
        }
    }
    
    func finishLoading() {
        DispatchQueue.main.async {
            self.isLoading = false
        }
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    @ObservedObject var state: WebViewState
    
    func makeCoordinator() -> Coordinator {
        Coordinator(state: state)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.customUserAgent = "ReadReceiptApp iOS"
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.delegate = context.coordinator
        webView.navigationDelegate = context.coordinator
        webView.scrollView.bounces = true
        
        // Keep a reference for adjusting insets on route changes
        context.coordinator.webView = webView
        
        // Initial insets - will be updated dynamically based on safe areas
        let headerHeight: CGFloat = 68
        let webTabBarHeight: CGFloat = 60  // Height of the web app's tab bar
        webView.scrollView.contentInset = UIEdgeInsets(top: headerHeight, left: 0, bottom: webTabBarHeight, right: 0)
        webView.scrollView.scrollIndicatorInsets = UIEdgeInsets(top: headerHeight, left: 0, bottom: webTabBarHeight, right: 0)
        
        // Inject JavaScript to robustly track route changes (React Router)
        let routeTrackingScript = WKUserScript(
            source: """
            (function() {
              function notify() {
                try { window.webkit.messageHandlers.routeChange.postMessage(window.location.pathname); } catch(e) {}
              }
              // Patch history methods
              var pushState = history.pushState;
              history.pushState = function(){ pushState.apply(this, arguments); notify(); };
              var replaceState = history.replaceState;
              history.replaceState = function(){ replaceState.apply(this, arguments); notify(); };
              // Listen to back/forward and hash
              window.addEventListener('popstate', notify);
              window.addEventListener('hashchange', notify);
              // Initial
              setTimeout(notify, 200);
            })();
            """,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(routeTrackingScript)
        webView.configuration.userContentController.add(context.coordinator, name: "routeChange")
        
        // Inject CSS to adjust spacing and ensure bottom tab bar visibility
        let paddingCSS = """
        body { padding-top: 0 !important; }
        html, body { min-height: 100vh; }
        [data-mobile-tabbar] { bottom: env(safe-area-inset-bottom) !important; }
        """
        let cssScript = WKUserScript(
            source: "var style = document.createElement('style'); style.innerHTML = '\(paddingCSS)'; document.head.appendChild(style);",
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(cssScript)
        
        // Ensure viewport-fit=cover so safe area insets apply
        let viewportPatch = WKUserScript(
            source: """
            (function(){
              var meta = document.querySelector('meta[name=viewport]');
              if (!meta) { 
                meta = document.createElement('meta'); 
                meta.name = 'viewport'; 
                document.head.appendChild(meta);
              }
              var content = meta.getAttribute('content') || '';
              if (!/viewport-fit=cover/.test(content)) {
                content = (content ? content + ', ' : '') + 'viewport-fit=cover';
                meta.setAttribute('content', content);
              }
            })();
            """,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(viewportPatch)
        
        // Inject network tracking to show loading for SPA and API calls
        let networkTrackingScript = WKUserScript(
            source: """
            (function(){
              if (window.__rrLoadingPatched) return; window.__rrLoadingPatched = true;
              var active = 0; var t;
              function post(){ try{ window.webkit.messageHandlers.loadingState.postMessage(active > 0); }catch(e){} }
              function onChange(){ if(active>0){ post(); } else { clearTimeout(t); t = setTimeout(post, 150); } }
              var origFetch = window.fetch;
              if (origFetch) {
                window.fetch = function(){ active++; onChange(); return origFetch.apply(this, arguments).finally(function(){ active--; onChange(); }); };
              }
              var origSend = XMLHttpRequest.prototype.send;
              XMLHttpRequest.prototype.send = function(){ active++; onChange(); this.addEventListener('loadend', function(){ active--; onChange(); }, { once: true }); return origSend.apply(this, arguments); };
            })();
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(networkTrackingScript)
        webView.configuration.userContentController.add(context.coordinator, name: "loadingState")
        
        // Ensure proper insets after initial layout
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            context.coordinator.updateInsets(isHome: true)
        }
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url == nil {
            let request = URLRequest(url: url)
            webView.load(request)
        }
    }
    
    class Coordinator: NSObject, UIScrollViewDelegate, WKNavigationDelegate, WKScriptMessageHandler {
        var state: WebViewState
        weak var webView: WKWebView?
        
        init(state: WebViewState) {
            self.state = state
        }
        
        // Compute and apply safe content insets dynamically
        func updateInsets(isHome: Bool) {
            guard let webView = self.webView else { return }
            let window = webView.window
            let safeTop = window?.safeAreaInsets.top ?? 44
            let safeBottom = window?.safeAreaInsets.bottom ?? 34
            let headerHeight: CGFloat = 68
            let webTabBarHeight: CGFloat = 60
            
            // Top: safe area + header (on home only)
            let insetTop = safeTop + (isHome ? headerHeight : 0)
            // Bottom: safe area + web app's tab bar
            let insetBottom = safeBottom + webTabBarHeight
            
            var inset = webView.scrollView.contentInset
            inset.top = insetTop
            inset.bottom = insetBottom
            webView.scrollView.contentInset = inset
            
            var indicatorInset = webView.scrollView.scrollIndicatorInsets
            indicatorInset.top = insetTop
            indicatorInset.bottom = insetBottom
            webView.scrollView.scrollIndicatorInsets = indicatorInset
        }
        
        func scrollViewDidScroll(_ scrollView: UIScrollView) {
            // Account for content inset when calculating scroll offset
            let offset = scrollView.contentOffset.y + scrollView.contentInset.top
            state.updateScrollOffset(offset)
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            DispatchQueue.main.async { self.state.isLoading = true }
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Hide loading animation after content loads
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                self.state.finishLoading()
                self.updateInsets(isHome: self.state.isHomePage)
            }
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "routeChange", let path = message.body as? String {
                DispatchQueue.main.async {
                    let isHome = (path == "/" || path == "")
                    self.state.isHomePage = isHome
                    self.updateInsets(isHome: isHome)
                    if isHome { self.state.headerOpacity = 1.0 }
                    // Show loading overlay during SPA route transitions with fail-safe auto-hide
                    self.state.isLoading = true
                    DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                        if self.state.isLoading {
                            self.state.isLoading = false
                        }
                    }
                }
            } else if message.name == "loadingState", let loading = message.body as? Bool {
                DispatchQueue.main.async {
                    self.state.isLoading = loading
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
