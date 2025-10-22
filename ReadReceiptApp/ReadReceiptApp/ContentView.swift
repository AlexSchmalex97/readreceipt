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

// Cute book loading animation with flipping pages
struct BookLoadingAnimation: View {
    @State private var pageFlipAngle: Double = 0
    @State private var bookBounce: CGFloat = 0
    @State private var glowOpacity: Double = 0.3
    
    var body: some View {
        VStack(spacing: 12) {
            ZStack {
                // Glow effect
                Circle()
                    .fill(
                        RadialGradient(
                            gradient: Gradient(colors: [
                                Color(red: 0.55, green: 0.45, blue: 0.35).opacity(glowOpacity),
                                Color.clear
                            ]),
                            center: .center,
                            startRadius: 5,
                            endRadius: 80
                        )
                    )
                    .frame(width: 160, height: 160)
                
                // Book with animated pages
                ZStack {
                    // Book base/cover
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(red: 0.55, green: 0.45, blue: 0.35))
                        .frame(width: 100, height: 120)
                        .shadow(color: Color.black.opacity(0.2), radius: 10, x: 0, y: 5)
                    
                    // Book spine
                    Rectangle()
                        .fill(Color(red: 0.35, green: 0.25, blue: 0.15))
                        .frame(width: 6, height: 120)
                    
                    // Left page (static)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(red: 0.98, green: 0.96, blue: 0.93))
                        .frame(width: 42, height: 100)
                        .overlay(
                            VStack(spacing: 6) {
                                ForEach(0..<3) { _ in
                                    RoundedRectangle(cornerRadius: 1)
                                        .fill(Color(red: 0.45, green: 0.35, blue: 0.25).opacity(0.5))
                                        .frame(width: 32, height: 2.5)
                                }
                            }
                        )
                        .offset(x: -26)
                    
                    // Right page (animated - flipping)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color(red: 0.98, green: 0.96, blue: 0.93))
                        .frame(width: 42, height: 100)
                        .overlay(
                            VStack(spacing: 6) {
                                ForEach(0..<3) { _ in
                                    RoundedRectangle(cornerRadius: 1)
                                        .fill(Color(red: 0.45, green: 0.35, blue: 0.25).opacity(0.5))
                                        .frame(width: 32, height: 2.5)
                                }
                            }
                        )
                        .offset(x: 26)
                        .rotation3DEffect(
                            .degrees(pageFlipAngle),
                            axis: (x: 0, y: 1, z: 0),
                            anchor: .leading,
                            perspective: 0.5
                        )
                    
                    // Checkmark overlay (appears during flip)
                    Image(systemName: "checkmark")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Color(red: 0.45, green: 0.35, blue: 0.25))
                        .offset(x: 26)
                        .opacity(pageFlipAngle > 90 ? 1 : 0)
                }
                .offset(y: bookBounce)
            }
            
            Text("Loading...")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(Color(red: 0.45, green: 0.35, blue: 0.25))
        }
        .onAppear {
            // Page flip animation
            withAnimation(Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true)) {
                pageFlipAngle = 180
            }
            
            // Gentle bounce
            withAnimation(Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                bookBounce = -8
            }
            
            // Glow pulse
            withAnimation(Animation.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                glowOpacity = 0.6
            }
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
        
        // Add padding: safe area (44) + header on home (68 total), just safe area on other pages (44)
        let safeAreaTop: CGFloat = 44
        let headerHeight: CGFloat = 68
        let bottomInsetForTabBar: CGFloat = 80
        webView.scrollView.contentInset = UIEdgeInsets(top: headerHeight, left: 0, bottom: bottomInsetForTabBar, right: 0)
        webView.scrollView.scrollIndicatorInsets = UIEdgeInsets(top: headerHeight, left: 0, bottom: bottomInsetForTabBar, right: 0)
        
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
        
        // Inject CSS to adjust spacing (do not hide tab bar)
        let paddingCSS = """
        body { padding-top: 0 !important; }
        """
        let cssScript = WKUserScript(
            source: "var style = document.createElement('style'); style.innerHTML = '\(paddingCSS)'; document.head.appendChild(style);",
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(cssScript)
        
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
            let safeTop = webView.safeAreaInsets.top
            let safeBottom = webView.safeAreaInsets.bottom
            let headerHeight: CGFloat = 68
            let bottomInsetForTabBar: CGFloat = 80
            let insetTop = safeTop + (isHome ? headerHeight : 0)
            let insetBottom = bottomInsetForTabBar + safeBottom
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
                    // Show loading overlay during SPA route transitions
                    self.state.isLoading = true
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
