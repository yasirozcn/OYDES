import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { IconPhone, IconQr } from "@/components/icons";
import { Button, LegalLinks, Logo, OptionCard, Screen, Title } from "@/components/ui";

type Role = "student" | "admin";

// Karşılama: öğrenci ve yönetici girişi iki eşit kart olarak seçilir; "Devam" seçilen girişe götürür.
export default function Welcome() {
  const [role, setRole] = useState<Role>("student");

  return (
    <Screen>
      <View style={{ marginBottom: 40 }}>
        <Logo />
      </View>
      <Title sub="Nasıl giriş yapacaksınız?">Hoş geldiniz</Title>
      <View style={{ flexDirection: "row", gap: 16 }}>
        <OptionCard title="Öğrenciyim" subtitle="Telefon numarasıyla giriş" icon={IconPhone} selected={role === "student"} onPress={() => setRole("student")} />
        <OptionCard title="Yöneticiyim" subtitle="Kapıdaki tablet için" icon={IconQr} selected={role === "admin"} onPress={() => setRole("admin")} />
      </View>
      <View style={{ flex: 1 }} />
      <Button title="Devam" onPress={() => router.push(role === "student" ? "/student-login" : "/admin-login")} style={{ minHeight: 60, borderRadius: 16 }} />
      <LegalLinks style={{ marginTop: 8 }} />
    </Screen>
  );
}
