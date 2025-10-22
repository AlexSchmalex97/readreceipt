import WidgetKit
import SwiftUI

// MARK: - Timeline Provider
struct ReadingGoalStatsProvider: TimelineProvider {
    func placeholder(in context: Context) -> ReadingGoalStatsEntry {
        ReadingGoalStatsEntry(date: Date(), goal: Self.placeholderGoal)
    }
    
    func getSnapshot(in context: Context, completion: @escaping (ReadingGoalStatsEntry) -> Void) {
        let goal = SharedDataManager.shared.getReadingGoal() ?? Self.placeholderGoal
        let entry = ReadingGoalStatsEntry(date: Date(), goal: goal)
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<ReadingGoalStatsEntry>) -> Void) {
        let goal = SharedDataManager.shared.getReadingGoal() ?? Self.placeholderGoal
        let entry = ReadingGoalStatsEntry(date: Date(), goal: goal)
        
        // Refresh every hour
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    static var placeholderGoal: ReadingGoalData {
        ReadingGoalData(goalCount: 100, completedCount: 53, year: 2025)
    }
}

// MARK: - Timeline Entry
struct ReadingGoalStatsEntry: TimelineEntry {
    let date: Date
    let goal: ReadingGoalData
}

// MARK: - Widget View
struct ReadingGoalStatsWidgetView: View {
    var entry: ReadingGoalStatsProvider.Entry
    @Environment(\.widgetFamily) var widgetFamily
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.95, green: 0.95, blue: 0.97), Color.white],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            Link(destination: URL(string: "readreceipt://goals")!) {
                VStack(spacing: 12) {
                    // Header
                    HStack {
                        Image(systemName: "target")
                            .foregroundColor(.orange)
                        Text("\(entry.goal.year) Reading Goal")
                            .font(.headline)
                            .foregroundColor(.primary)
                        Spacer()
                    }
                    
                    // Progress Ring and Stats
                    HStack(spacing: 20) {
                        // Circular Progress Ring
                        ZStack {
                            Circle()
                                .stroke(Color.gray.opacity(0.2), lineWidth: 12)
                                .frame(width: 80, height: 80)
                            
                            Circle()
                                .trim(from: 0, to: entry.goal.progressPercentage / 100)
                                .stroke(
                                    LinearGradient(
                                        colors: [Color.orange, Color.red],
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    ),
                                    style: StrokeStyle(lineWidth: 12, lineCap: .round)
                                )
                                .frame(width: 80, height: 80)
                                .rotationEffect(.degrees(-90))
                                .animation(.spring(), value: entry.goal.progressPercentage)
                            
                            VStack(spacing: 0) {
                                Text("\(Int(entry.goal.progressPercentage))%")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundColor(.primary)
                            }
                        }
                        
                        // Stats
                        VStack(alignment: .leading, spacing: 8) {
                            statRow(
                                icon: "checkmark.circle.fill",
                                color: .green,
                                label: "Completed",
                                value: "\(entry.goal.completedCount)"
                            )
                            
                            statRow(
                                icon: "flag.fill",
                                color: .orange,
                                label: "Goal",
                                value: "\(entry.goal.goalCount)"
                            )
                            
                            statRow(
                                icon: "book.fill",
                                color: .blue,
                                label: "Remaining",
                                value: "\(max(0, entry.goal.goalCount - entry.goal.completedCount))"
                            )
                        }
                        
                        Spacer()
                    }
                }
                .padding()
            }
        }
    }
    
    private func statRow(icon: String, color: Color, label: String, value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundColor(color)
                .frame(width: 16)
            
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            
            Spacer()
            
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
        }
    }
}

// MARK: - Widget Configuration
struct ReadingGoalStatsWidget: Widget {
    let kind: String = "ReadingGoalStatsWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ReadingGoalStatsProvider()) { entry in
            ReadingGoalStatsWidgetView(entry: entry)
        }
        .configurationDisplayName("Reading Goal Stats")
        .description("Track your yearly reading goal progress")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Previews
struct ReadingGoalStatsWidget_Previews: PreviewProvider {
    static var previews: some View {
        ReadingGoalStatsWidgetView(entry: ReadingGoalStatsEntry(
            date: Date(),
            goal: ReadingGoalStatsProvider.placeholderGoal
        ))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
