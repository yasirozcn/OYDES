import ExpoModulesCore

// iOS uygulamaların BLE "service data" yayınlamasına izin vermez; kiosk tableti Android olmalıdır.
// Bu modül iOS'ta yalnızca "desteklenmiyor" döner; öğrenci tarafındaki BLE taraması iOS'ta sorunsuz çalışır.
public class KioskBeaconModule: Module {
  public func definition() -> ModuleDefinition {
    Name("KioskBeacon")

    Function("isSupported") {
      return false
    }

    Function("getLastError") { () -> String? in
      return "IOS_NOT_SUPPORTED"
    }

    AsyncFunction("startAdvertising") { (_: String, _: String) -> Bool in
      return false
    }

    AsyncFunction("stopAdvertising") {
    }
  }
}
