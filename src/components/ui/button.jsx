import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import styles from "./button.module.css";

const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    const buttonClasses = [
      styles.button,
      styles[variant],
      size === "default" ? styles.default_size : styles[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return <Comp className={buttonClasses} ref={ref} {...props} />;
  }
);

Button.displayName = "Button";

export { Button };
