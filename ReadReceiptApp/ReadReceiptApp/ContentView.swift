//
//  ContentView.swift
//  ReadReceiptApp
//
//  Created by Alexandra Ramirez on 10/13/25.
//

import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        VStack(spacing: 0) {
            // Thin header with centered logo
            HStack {
                Spacer()
                Image("ReadReceiptHeader")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(height: 40)
                Spacer()
            }
            .padding(.vertical, 8)
            .background(Color(red: 0.96, green: 0.95, blue: 0.94))
            
            // WebView
            WebView(url: URL(string: "https://readreceiptapp.com")!)
        }
        .edgesIgnoringSafeArea(.bottom)
    }
}

struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.customUserAgent = "ReadReceiptApp iOS"
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        
        // Inject CSS to add top padding to the web content
        let paddingCSS = """
        body { padding-top: 0 !important; }
        [data-mobile-tabbar] { display: none !important; }
        """
        let cssScript = WKUserScript(source: "var style = document.createElement('style'); style.innerHTML = '\(paddingCSS)'; document.head.appendChild(style);", injectionTime: .atDocumentEnd, forMainFrameOnly: true)
        webView.configuration.userContentController.addUserScript(cssScript)
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {
        let request = URLRequest(url: url)
        webView.load(request)
    }
}

#Preview {
    ContentView()
}
