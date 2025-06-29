import * as React from "react";
import styles from "./textarea.module.css";

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  const textareaClasses = [styles.textarea, className].filter(Boolean).join(" ");

  return <textarea className={textareaClasses} ref={ref} {...props} />;
});

Textarea.displayName = "Textarea";

export { Textarea };
