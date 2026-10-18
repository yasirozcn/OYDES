Pod::Spec.new do |s|
  s.name           = 'KioskBeacon'
  s.version        = '1.0.0'
  s.summary        = 'Kiosk BLE yayın modülü (iOS desteklenmez, yer tutucu)'
  s.description    = 'Kiosk tabletinin dönen BLE jetonunu yayınlar. iOS service data yayınlayamadığı için iOS tarafı kapalıdır.'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
