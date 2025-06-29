import * as React from "react";
import styles from "./card.module.css";

const Card = React.forwardRef(({ className, ...props }, ref) => {
  const cardClasses = [styles.card, className].filter(Boolean).join(" ");
  return <div ref={ref} className={cardClasses} {...props} />;
});
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => {
  const headerClasses = [styles.cardHeader, className].filter(Boolean).join(" ");
  return <div ref={ref} className={headerClasses} {...props} />;
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => {
  const titleClasses = [styles.cardTitle, className].filter(Boolean).join(" ");
  return <h3 ref={ref} className={titleClasses} {...props} />;
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => {
  const descriptionClasses = [styles.cardDescription, className].filter(Boolean).join(" ");
  return <p ref={ref} className={descriptionClasses} {...props} />;
});
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => {
  const contentClasses = [styles.cardContent, className].filter(Boolean).join(" ");
  return <div ref={ref} className={contentClasses} {...props} />;
});
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => {
  const footerClasses = [styles.cardFooter, className].filter(Boolean).join(" ");
  return <div ref={ref} className={footerClasses} {...props} />;
});
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
