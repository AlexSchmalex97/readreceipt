# ReadReceipt iOS WidgetKit Setup Instructions

## Overview
This guide will help you set up three interactive WidgetKit widgets for the ReadReceipt iOS app.

## Prerequisites
- Xcode 15.0 or later
- iOS 17.0+ target deployment
- Valid Apple Developer account
- ReadReceiptApp project transferred to GitHub

## Step 1: Create Widget Extension in Xcode

1. Open `ReadReceiptApp.xcodeproj` in Xcode
2. Go to **File → New → Target**
3. Select **Widget Extension** template
4. Configure the widget extension:
   - Product Name: `ReadReceiptWidgets`
   - Team: Select your development team
   - Language: Swift
   - Include Configuration Intent: No (unchecked)
5. Click **Finish**
6. When prompted "Activate 'ReadReceiptWidgets' scheme?", click **Activate**

## Step 2: Enable App Groups

### For Main App:
1. Select the **ReadReceiptApp** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** and add **App Groups**
4. Click **+** to add a new app group
5. Name it: `group.app.lovable.cee96301737a4542a6bb93de6bf7e75c`
6. Ensure it's checked

### For Widget Extension:
1. Select the **ReadReceiptWidgets** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability** and add **App Groups**
4. Check the same app group: `group.app.lovable.cee96301737a4542a6bb93de6bf7e75c`

## Step 3: Add Widget Files to Xcode

1. Delete the default `ReadReceiptWidgets.swift` file created by Xcode
2. In Finder, copy all files from `ReadReceiptApp/ReadReceiptWidgets/` folder
3. Drag and drop into Xcode under the **ReadReceiptWidgets** group
4. Ensure **Target Membership** is set to **ReadReceiptWidgets** for all files

Your widget extension should now have this structure:
```
ReadReceiptWidgets/
├── ReadReceiptWidgets.swift (main bundle)
├── Models/
│   └── BookData.swift
├── Utilities/
│   ├── SharedDataManager.swift
│   └── SupabaseService.swift
├── Widgets/
│   ├── InProgressBooksWidget.swift
│   ├── UpdateProgressWidget.swift
│   └── ReadingGoalStatsWidget.swift
└── Info.plist
```

## Step 4: Configure Supabase Credentials

1. Open `ReadReceiptApp/ReadReceiptWidgets/Utilities/SupabaseService.swift`
2. Replace placeholder values:
   ```swift
   private let supabaseURL = "YOUR_ACTUAL_SUPABASE_URL"
   private let supabaseAnonKey = "YOUR_ACTUAL_SUPABASE_ANON_KEY"
   ```
3. Get these values from your Supabase project settings

## Step 5: Configure Deep Links in Main App

Add URL scheme support to your main app:

1. Select **ReadReceiptApp** target
2. Go to **Info** tab
3. Expand **URL Types**
4. Click **+** to add a new URL type
5. Configure:
   - Identifier: `app.lovable.readreceipt`
   - URL Schemes: `readreceipt`
   - Role: Editor

## Step 6: Implement Deep Link Handling

In your main app's `AppDelegate` or SwiftUI `App` file, add deep link handling:

```swift
import SwiftUI

@main
struct ReadReceiptAppApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
    }
    
    func handleDeepLink(_ url: URL) {
        // Parse URL: readreceipt://book/{bookId} or readreceipt://goals
        guard url.scheme == "readreceipt" else { return }
        
        if url.host == "book", let bookId = url.pathComponents.last {
            // Navigate to book detail view
            print("Open book: \(bookId)")
        } else if url.host == "goals" {
            // Navigate to goals page
            print("Open goals page")
        }
    }
}
```

## Step 7: Implement Data Syncing in Main App

Add this code to sync widget data with Supabase in your main app:

```swift
import Foundation

class WidgetDataSyncManager {
    static let shared = WidgetDataSyncManager()
    
    func syncDataToWidgets() async {
        // Get user ID from current session
        guard let userId = await getCurrentUserId() else { return }
        
        do {
            // Fetch in-progress books
            let books = try await fetchInProgressBooks(userId: userId)
            SharedDataManager.shared.saveInProgressBooks(books)
            
            // Fetch current book (first in-progress book)
            if let currentBook = books.first {
                SharedDataManager.shared.saveCurrentBook(currentBook)
            }
            
            // Fetch reading goal
            let goal = try await fetchReadingGoal(userId: userId)
            SharedDataManager.shared.saveReadingGoal(goal)
            
            // Reload all widgets
            WidgetCenter.shared.reloadAllTimelines()
        } catch {
            print("Error syncing widget data: \(error)")
        }
    }
    
    private func getCurrentUserId() async -> String? {
        // Implement Supabase auth to get current user ID
        return nil
    }
    
    private func fetchInProgressBooks(userId: String) async throws -> [BookData] {
        return try await SupabaseService.shared.fetchInProgressBooks(userId: userId)
    }
    
    private func fetchReadingGoal(userId: String) async throws -> ReadingGoalData? {
        return try await SupabaseService.shared.fetchReadingGoal(userId: userId)
    }
}
```

Call `WidgetDataSyncManager.shared.syncDataToWidgets()` whenever:
- User updates book progress
- App comes to foreground
- User completes a book
- Reading goal is updated

## Step 8: Build and Run

1. Select **ReadReceiptWidgets** scheme
2. Choose a simulator or physical device (iOS 17+)
3. Build and run (⌘R)
4. Long-press on home screen
5. Tap **+** button to add widgets
6. Search for "ReadReceipt" widgets
7. Add your widgets to the home screen

## Step 9: Test Interactive Features

For the **Update Progress Widget**:
1. Add the widget to home screen
2. Tap the **+** or **-** buttons
3. Progress should update instantly
4. Open main app to verify sync with Supabase

## Widget Features

### 1. In Progress Books Widget
- Displays up to 3 books currently being read
- Shows cover, title, author, and progress
- Tap book to open in app

### 2. Update Progress Widget
- Shows current active book
- Interactive +/- buttons to update pages (iOS 17+)
- Instant local updates
- Tap book to view details

### 3. Reading Goal Stats Widget
- Shows yearly reading goal
- Circular progress indicator
- Completed vs. goal count
- Tap to view full goals page

## Troubleshooting

### Widgets not appearing?
- Verify App Group is enabled for both targets
- Check Bundle Identifier is correct
- Ensure iOS deployment target is 17.0+

### Data not syncing?
- Verify Supabase credentials in `SupabaseService.swift`
- Check App Group identifier matches in both targets
- Ensure main app calls sync methods

### Interactive buttons not working?
- Requires iOS 17+ device/simulator
- Verify App Intents are properly configured
- Check widget is updated to latest timeline

## Best Practices

1. **Sync Frequency**: Call `syncDataToWidgets()` when app enters foreground
2. **Cache First**: Widgets read from local cache for instant display
3. **Background Sync**: Main app syncs cache changes to Supabase
4. **Error Handling**: Always provide fallback placeholder data
5. **Testing**: Test on physical device for best experience

## Next Steps

1. Customize widget colors to match app theme
2. Add more widget sizes (small, large)
3. Implement background refresh
4. Add widget configuration options
5. Submit to App Store

## Additional Resources

- [Apple WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [App Groups Guide](https://developer.apple.com/documentation/bundleresources/entitlements/com_apple_security_application-groups)
- [App Intents Documentation](https://developer.apple.com/documentation/appintents)
