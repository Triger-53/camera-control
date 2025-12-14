import Foundation
import CoreGraphics

// Standard input reader
while let line = readLine() {
    let parts = line.split(separator: " ")
    if parts.isEmpty { continue }
    
    let command = String(parts[0])
    
    // Get current mouse position for clicks
    let currentPos = CGEvent(source: nil)?.location ?? CGPoint.zero
    
    switch command {
    case "m": // Move: m x y
        if parts.count >= 3, let x = Double(parts[1]), let y = Double(parts[2]) {
            let point = CGPoint(x: x, y: y)
            if let event = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left) {
                event.post(tap: .cghidEventTap)
            }
        }
        
    case "l": // Left Down: l
        if let event = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: currentPos, mouseButton: .left) {
            event.post(tap: .cghidEventTap)
        }
        
    case "u": // Left Up: u
        if let event = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: currentPos, mouseButton: .left) {
            event.post(tap: .cghidEventTap)
        }
        
    case "r": // Right Click: r
        if let event = CGEvent(mouseEventSource: nil, mouseType: .rightMouseDown, mouseCursorPosition: currentPos, mouseButton: .right) {
            event.post(tap: .cghidEventTap)
        }
        if let event = CGEvent(mouseEventSource: nil, mouseType: .rightMouseUp, mouseCursorPosition: currentPos, mouseButton: .right) {
            event.post(tap: .cghidEventTap)
        }
    
    case "d": // Drag (Left Down + Move): d x y
        if parts.count >= 3, let x = Double(parts[1]), let y = Double(parts[2]) {
            let point = CGPoint(x: x, y: y)
            if let event = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDragged, mouseCursorPosition: point, mouseButton: .left) {
                event.post(tap: .cghidEventTap)
            }
        }
        
    default:
        break
    }
}
