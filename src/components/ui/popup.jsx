"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, XCircle, AlertCircle, HelpCircle } from "lucide-react";
import styles from "./popup.module.css";

export function Popup({
  isOpen,
  onClose,
  title,
  message,
  type,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className={styles.iconSuccess} />;
      case "error":
        return <XCircle className={styles.iconError} />;
      case "warning":
        return <AlertCircle className={styles.iconWarning} />;
      case "confirm":
        return <HelpCircle className={styles.iconConfirm} />;
      default:
        return <AlertCircle className={styles.iconInfo} />;
    }
  };

  const getContentClass = () => {
    return [styles.popupContent, styles[type]].join(" ");
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className={styles.overlay}>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* Popup */}
      <div className={styles.popup}>
        <div className={getContentClass()}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerContent}>
              {getIcon()}
              <h3 className={styles.title}>&nbsp;{title}</h3>
            </div>
            <button onClick={onClose} className={styles.closeButton}>
              <X className={styles.closeIcon} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
            <p className={styles.message}>{message}</p>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            {type === "confirm" ? (
              <>
                <button onClick={onClose} className={`${styles.button} ${styles.cancelButton}`}>
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`${styles.button} ${styles.confirmButton}`}
                >
                  {confirmText}
                </button>
              </>
            ) : (
              <button onClick={onClose} className={`${styles.button} ${styles.confirmButton}`}>
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Hook for easier popup management
export function usePopup() {
  const [popup, setPopup] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "info",
  });

  const showPopup = (title, message, type = "info", onConfirm, confirmText, cancelText) => {
    setPopup({
      isOpen: true,
      title,
      message,
      type,
      onConfirm,
      confirmText,
      cancelText,
    });
  };

  const hidePopup = () => {
    setPopup((prev) => ({ ...prev, isOpen: false }));
  };

  const showSuccess = (title, message) => {
    showPopup(title, message, "success");
  };

  const showError = (title, message) => {
    showPopup(title, message, "error");
  };

  const showWarning = (title, message) => {
    showPopup(title, message, "warning");
  };

  const showConfirm = (title, message, onConfirm, confirmText = "Yes", cancelText = "No") => {
    showPopup(title, message, "confirm", onConfirm, confirmText, cancelText);
  };

  return {
    popup,
    showPopup,
    hidePopup,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    PopupComponent: () => (
      <Popup
        isOpen={popup.isOpen}
        onClose={hidePopup}
        title={popup.title}
        message={popup.message}
        type={popup.type}
        onConfirm={popup.onConfirm}
        confirmText={popup.confirmText}
        cancelText={popup.cancelText}
      />
    ),
  };
}
