import WidgetKit
import SwiftUI

@main
struct ReadReceiptWidgetsBundle: WidgetBundle {
    var body: some Widget {
        InProgressBooksWidget()
        UpdateProgressWidget()
        ReadingGoalStatsWidget()
    }
}
