import * as React from "react";
import styles from "./label.module.css";

const Label = React.forwardRef(({ className, ...props }, ref) => {
  const labelClasses = [styles.label, className].filter(Boolean).join(" ");

  return <label ref={ref} className={labelClasses} {...props} />;
});

Label.displayName = "Label";

export { Label };
