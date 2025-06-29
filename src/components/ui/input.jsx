import * as React from "react";
import styles from "./input.module.css";

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  const inputClasses = [styles.input, className].filter(Boolean).join(" ");

  return <input type={type} className={inputClasses} ref={ref} {...props} />;
});

Input.displayName = "Input";

export { Input };
