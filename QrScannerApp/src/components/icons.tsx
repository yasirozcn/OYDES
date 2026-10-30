import Svg, { Path } from "react-native-svg";
import { colors } from "@/lib/config";

// Tasarım sistemindeki çizgi ikonlar (24×24, yuvarlak uçlu). Yalnızca görünüm içindir.
type IconProps = { size?: number; color?: string; strokeWidth?: number };

function make(d: string, defaultStroke = 2) {
  return function Icon({ size = 24, color = colors.ink, strokeWidth = defaultStroke }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <Path d={d} />
      </Svg>
    );
  };
}

export const IconBack = make("M15 5l-7 7 7 7", 2.2);
export const IconEye = make("M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z");
export const IconEyeOff = make("M17.9 17.9A10 10 0 0112 19c-6.4 0-10-7-10-7a18 18 0 015-5.9M9.9 5.2A9 9 0 0112 5c6.4 0 10 7 10 7a18 18 0 01-2.2 3.2M14.1 14.1a3 3 0 01-4.2-4.2M3 3l18 18");
export const IconCheck = make("M5 12.5l4.5 4.5L19 7", 3);
export const IconIn = make("M10 17l5-5-5-5M15 12H3M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4");
export const IconOut = make("M14 17l5-5-5-5M19 12H7M10 4H6a2 2 0 00-2 2v12a2 2 0 002 2h4");
export const IconQr = make("M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2");
export const IconBluetooth = make("M7 7l10 10-5 5V2l5 5L7 17");
export const IconBluetoothOff = make("M7 7l10 10-5 5V2l5 5L7 17M3 3l18 18");
export const IconInfo = make("M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 7.5v.01");
export const IconAlert = make("M12 3l9.5 17h-19zM12 10v4M12 17.5v.01");
export const IconX = make("M6 6l12 12M18 6L6 18", 2.6);
export const IconPhone = make("M8 2h8a2 2 0 012 2v16a2 2 0 01-2 2H8a2 2 0 01-2-2V4a2 2 0 012-2zM11 18h2");
export const IconShield = make("M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5", 1.8);
export const IconMail = make("M3 6h18v12H3zM3 7l9 6 9-6", 1.8);
export const IconLogout = make("M15 17l5-5-5-5M20 12H9M12 4H6a2 2 0 00-2 2v12a2 2 0 002 2h6");
export const IconDoor = make("M7 21V4h10v17M4 21h16M14 12v.01");
export const IconRefresh = make("M21 12a9 9 0 11-2.64-6.36L21 8M21 3v5h-5");
export const IconClock = make("M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2");
