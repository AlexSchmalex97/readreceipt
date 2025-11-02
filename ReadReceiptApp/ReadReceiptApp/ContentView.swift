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
        }
    }
}

// Book loading animation component matching the website logo
struct BookLoadingAnimation: View {
    @State private var checkmarkScale: CGFloat = 0.5
    @State private var checkmarkOpacity: Double = 0.3
    
    var body: some View {
        ZStack {
            // Book base with spine
            ZStack {
                // Left page
                RoundedRectangle(cornerRadius: 0)
                    .fill(Color(red: 0.98, green: 0.96, blue: 0.93))
                    .frame(width: 70, height: 100)
                    .offset(x: -35)
                    .overlay(
                        VStack(spacing: 8) {
                            // Text lines on left page
                            ForEach(0..<4) { _ in
                                RoundedRectangle(cornerRadius: 1)
                                    .fill(Color(red: 0.45, green: 0.35, blue: 0.25))
                                    .frame(width: 50, height: 3)
                            }
                        }
                        .offset(x: -35)
                    )
                
                // Right page
                RoundedRectangle(cornerRadius: 0)
                    .fill(Color(red: 0.98, green: 0.96, blue: 0.93))
                    .frame(width: 70, height: 100)
                    .offset(x: 35)
                    .overlay(
                        // Checkmark on right page
                        Path { path in
                            path.move(to: CGPoint(x: 15, y: 50))
                            path.addLine(to: CGPoint(x: 30, y: 65))
                            path.addLine(to: CGPoint(x: 55, y: 35))
                        }
                        .stroke(Color(red: 0.45, green: 0.35, blue: 0.25), lineWidth: 4)
                        .scaleEffect(checkmarkScale)
                        .opacity(checkmarkOpacity)
                        .offset(x: 35, y: 0)
                    )
                
                // Book spine
                Rectangle()
                    .fill(Color(red: 0.35, green: 0.25, blue: 0.15))
                    .frame(width: 4, height: 100)
            }
            .overlay(
                // Book outline
                RoundedRectangle(cornerRadius: 4)
                    .stroke(Color(red: 0.35, green: 0.25, blue: 0.15), lineWidth: 3)
                    .frame(width: 144, height: 104)
            )
            .overlay(
                // Bottom tab/bookmark
                Path { path in
                    path.move(to: CGPoint(x: -10, y: 52))
                    path.addLine(to: CGPoint(x: -10, y: 60))
                    path.addLine(to: CGPoint(x: 0, y: 56))
                    path.addLine(to: CGPoint(x: 10, y: 60))
                    path.addLine(to: CGPoint(x: 10, y: 52))
                }
                .fill(Color(red: 0.55, green: 0.45, blue: 0.35))
                .offset(y: 0)
            )
        }
        .onAppear {
            withAnimation(Animation.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                checkmarkScale = 1.0
                checkmarkOpacity = 1.0
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
        
        // No top padding needed since header is removed
        webView.scrollView.contentInset = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
        webView.scrollView.scrollIndicatorInsets = UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)
        
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
        
        // Inject flag so web app knows it's running in native iOS app
        let nativeFlagScript = WKUserScript(
            source: "window.__RR_NATIVE_IOS_APP = true;",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(nativeFlagScript)
        
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
                    // No inset adjustments needed since header is removed
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
