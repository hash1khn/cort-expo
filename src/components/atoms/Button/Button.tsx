import React from "react";
import { ActivityIndicator, Pressable, Text } from "react-native";

type Variant = "primary" | "navy" | "outline" | "danger" | "success";

type Props = {
  title: string;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  onPress?: () => void;
  testID?: string;
};

const VARIANT_CONTAINER: Record<Variant, string> = {
  primary: "bg-[#FF5A00]",
  navy: "bg-[#0B1C2D]",
  outline: "bg-transparent border-2 border-red-500",
  danger: "bg-[#D32F2F]",
  success: "bg-[#1B8A5A]",
};

const VARIANT_TEXT: Record<Variant, string> = {
  primary: "text-white",
  navy: "text-white",
  outline: "text-red-500",
  danger: "text-white",
  success: "text-white",
};

export function CortButton({
  title,
  variant = "primary",
  disabled = false,
  loading = false,
  onPress,
  testID,
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      className={[
        "w-full h-[55px] rounded-[14px] px-4 items-center justify-center",
        VARIANT_CONTAINER[variant],
        isDisabled && "opacity-50",
      ].filter(Boolean).join(" ")}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === "outline" ? "#ef4444" : "#ffffff"}
        />
      ) : (
        <Text
          className={[
            "text-[15px] font-semibold tracking-wide",
            VARIANT_TEXT[variant],
          ].join(" ")}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}
