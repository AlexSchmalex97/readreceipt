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
                        .frame(height: 60)
                    Spacer()
                }
                .padding(.vertical, 8)
                .padding(.top, 40) // Safe area padding
                .background(Color(red: 0.96, green: 0.95, blue: 0.94))
                .opacity(webViewState.headerOpacity)
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
        
        // Add top padding to web content
        webView.scrollView.contentInset = UIEdgeInsets(top: 76, left: 0, bottom: 0, right: 0)
        webView.scrollView.scrollIndicatorInsets = UIEdgeInsets(top: 76, left: 0, bottom: 0, right: 0)
        
        // Inject JavaScript to track route changes and scroll
        let routeTrackingScript = WKUserScript(
            source: """
            window.addEventListener('popstate', function() {
                window.webkit.messageHandlers.routeChange.postMessage(window.location.pathname);
            });
            
            // Also track initial route
            setTimeout(() => {
                window.webkit.messageHandlers.routeChange.postMessage(window.location.pathname);
            }, 500);
            
            // Intercept navigation clicks
            document.addEventListener('click', function(e) {
                setTimeout(() => {
                    window.webkit.messageHandlers.routeChange.postMessage(window.location.pathname);
                }, 100);
            });
            """,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        webView.configuration.userContentController.addUserScript(routeTrackingScript)
        webView.configuration.userContentController.add(context.coordinator, name: "routeChange")
        
        // Inject CSS to hide web header and adjust spacing
        let paddingCSS = """
        body { padding-top: 0 !important; }
        [data-mobile-tabbar] { display: none !important; }
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
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.state.finishLoading()
            }
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "routeChange", let path = message.body as? String {
                DispatchQueue.main.async {
                    self.state.isHomePage = (path == "/" || path == "")
                }
            }
        }
    }
}

#Preview {
    ContentView()
}
