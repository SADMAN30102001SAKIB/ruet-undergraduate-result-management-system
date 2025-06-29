import * as React from "react";
import styles from "./select.module.css";

const Select = React.forwardRef(({ className, children, ...props }, ref) => {
  const selectClasses = [styles.select, className].filter(Boolean).join(" ");

  return (
    <select className={selectClasses} ref={ref} {...props}>
      {children}
    </select>
  );
});

Select.displayName = "Select";

export { Select };
