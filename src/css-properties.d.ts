// CSS custom properties augmentation for React.CSSProperties
import type { CSSProperties } from "react";

declare module "react" {
    interface CSSProperties {
        [key: `--${string}`]: string | number | undefined;
    }
}
