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

// Book loading animation component
struct BookLoadingAnimation: View {
    @State private var isAnimating = false
    @State private var pageFlip = 0
    
    var body: some View {
        ZStack {
            // Book cover/base
            RoundedRectangle(cornerRadius: 8)
                .fill(Color(red: 0.55, green: 0.45, blue: 0.35))
                .frame(width: 120, height: 160)
                .shadow(radius: 10)
            
            // Left page
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.white)
                .frame(width: 50, height: 140)
                .offset(x: -25)
                .opacity(0.9)
            
            // Right page (animated)
            RoundedRectangle(cornerRadius: 6)
                .fill(Color.white)
                .frame(width: 50, height: 140)
                .offset(x: 25)
                .rotation3DEffect(
                    .degrees(isAnimating ? -180 : 0),
                    axis: (x: 0, y: 1, z: 0),
                    anchor: .leading
                )
                .opacity(0.9)
            
            // Book spine line
            Rectangle()
                .fill(Color(red: 0.45, green: 0.35, blue: 0.25))
                .frame(width: 3, height: 150)
        }
        .onAppear {
            withAnimation(Animation.easeInOut(duration: 1.2).repeatForever(autoreverses: true)) {
                isAnimating = true
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
        
        // Add top padding to web content (matches header height)
        let headerInsetTop: CGFloat = 44
        webView.scrollView.contentInset = UIEdgeInsets(top: headerInsetTop, left: 0, bottom: 0, right: 0)
        webView.scrollView.scrollIndicatorInsets = UIEdgeInsets(top: headerInsetTop, left: 0, bottom: 0, right: 0)
        
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
        
        func scrollViewDidScroll(_ scrollView: UIScrollView) {
            // Account for content inset when calculating scroll offset
            let offset = scrollView.contentOffset.y + scrollView.contentInset.top
            state.updateScrollOffset(offset)
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            // Hide loading animation after content loads
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                self.state.finishLoading()
            }
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "routeChange", let path = message.body as? String {
                DispatchQueue.main.async {
                    let isHome = (path == "/" || path == "")
                    self.state.isHomePage = isHome
                    if let webView = self.webView {
                        let headerInsetTop: CGFloat = 56
                        let insetTop: CGFloat = isHome ? headerInsetTop : 0
                        var inset = webView.scrollView.contentInset
                        inset.top = insetTop
                        webView.scrollView.contentInset = inset
                        var indicatorInset = webView.scrollView.scrollIndicatorInsets
                        indicatorInset.top = insetTop
                        webView.scrollView.scrollIndicatorInsets = indicatorInset
                    }
                    if isHome { self.state.headerOpacity = 1.0 }
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
