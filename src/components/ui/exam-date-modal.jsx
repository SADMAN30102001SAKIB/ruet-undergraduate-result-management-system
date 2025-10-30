"use client";

import { useState, useEffect } from "react";
import { X, Calendar, FileText } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import styles from "./popup.module.css";

export function ExamDateModal({ isOpen, onClose, onGeneratePDF, schedule, groupName }) {
  const [examDates, setExamDates] = useState({});
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize dates when schedule changes
  useEffect(() => {
    if (schedule && schedule.numDays) {
      const initialDates = {};
      for (let i = 0; i < schedule.numDays; i++) {
        // Set default dates starting from tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1 + i);
        initialDates[i] = tomorrow.toISOString().split("T")[0];
      }
      setExamDates(initialDates);
    }
  }, [schedule]);

  const handleDateChange = (dayIndex, date) => {
    setExamDates((prev) => ({
      ...prev,
      [dayIndex]: date,
    }));
  };

  const handleGeneratePDF = async () => {
    // Validate all dates are provided
    const missingDates = Object.values(examDates).some((date) => !date);
    if (missingDates) {
      alert("Please provide dates for all exam days");
      return;
    }

    setIsGenerating(true);
    try {
      await onGeneratePDF(examDates);
      onClose();
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen || !schedule) return null;

  return (
    <div className={styles.overlay}>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div className={styles.popup}>
        <div className={`${styles.popupContent} ${styles.info}`}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              <FileText className={styles.iconInfo} />
              <h3 className={styles.title}>&nbsp;Generate Exam Routine PDF</h3>
            </div>
            <button onClick={onClose} className={styles.closeButton}>
              <X className={styles.closeIcon} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            <div style={{ marginBottom: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem", fontWeight: "600" }}>
                {groupName} - Exam Schedule
              </h4>
              <p style={{ color: "#666", fontSize: "0.9rem" }}>
                {schedule.numDays} exam days required •{" "}
                {Object.keys(schedule.examDays).reduce(
                  (total, day) => total + schedule.examDays[day].length,
                  0
                )}{" "}
                courses scheduled
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: schedule.numDays > 4 ? "repeat(2, 1fr)" : "1fr",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              {Array.from({ length: schedule.numDays }, (_, index) => (
                <div
                  key={index}
                  style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
                >
                  <Label
                    htmlFor={`date-${index}`}
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Calendar size={14} style={{ marginRight: "0.5rem" }} />
                    Exam Day {index + 1}
                    <span style={{ fontSize: "0.8rem", color: "#666", marginLeft: "0.5rem" }}>
                      ({schedule.examDays[index]?.length || 0}{" "}
                      {(schedule.examDays[index]?.length || 0) === 1 ? "course" : "courses"})
                    </span>
                  </Label>
                  <Input
                    id={`date-${index}`}
                    type="date"
                    value={examDates[index] || ""}
                    onChange={(e) => handleDateChange(index, e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "1rem",
                padding: "1rem",
                backgroundColor: "#f8f9fa",
                borderRadius: "0.5rem",
              }}
            >
              <h5 style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>Schedule Preview:</h5>
              {Object.entries(schedule.examDays).map(([dayIndex, courses]) => (
                <div key={dayIndex} style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
                  <strong>Day {parseInt(dayIndex) + 1}:</strong>{" "}
                  {courses.map((course) => course.code).join(", ")}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <Button onClick={onClose} variant="outline" disabled={isGenerating}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePDF} disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate PDF"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
