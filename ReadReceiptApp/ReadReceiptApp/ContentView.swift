//
//  ContentView.swift
//  ReadReceiptApp
//
//  Created by Alexandra Ramirez on 10/13/25.
//

import SwiftUI
import WebKit

struct ContentView: View {
    @StateObject private var webViewState = WebViewState()
    
    var body: some View {
        ZStack(alignment: .top) {
            // WebView
            WebView(url: URL(string: "https://readreceiptapp.com")!, state: webViewState)
                .edgesIgnoringSafeArea(.all)
            
            // Header that fades based on scroll (only on home page)
            if webViewState.isHomePage {
                HStack {
                    Spacer()
                    Image("ReadReceiptHeader")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(height: 60)
                    Spacer()
                }
                .padding(.vertical, 8)
                .background(Color(red: 0.96, green: 0.95, blue: 0.94))
                .opacity(webViewState.headerOpacity)
            }
        }
    }
}

class WebViewState: ObservableObject {
    @Published var isHomePage = true
    @Published var headerOpacity: Double = 1.0
    @Published var scrollOffset: CGFloat = 0
    
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
        
        // Inject JavaScript to track route changes
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
            let offset = scrollView.contentOffset.y
            state.updateScrollOffset(offset)
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
