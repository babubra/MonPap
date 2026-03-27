// MonPap iOS — Emoji Picker
// Сетка emoji по тематическим группам с поиском

import SwiftUI

struct EmojiPickerView: View {

    @Binding var selectedEmoji: String
    @State private var searchText = ""

    private static let emojiGroups: [(title: String, emojis: [String])] = {
        // Emoji через Unicode scalar values для надёжного рендеринга
        func e(_ codes: [UInt32]) -> [String] {
            codes.compactMap { code in
                guard let scalar = Unicode.Scalar(code) else { return nil }
                return String(scalar)
            }
        }

        return [
            ("Еда", e([
                0x1F355, // pizza
                0x1F354, // hamburger
                0x1F357, // poultry leg
                0x1F969, // cut of meat
                0x1F370, // cake
                0x1F366, // ice cream
                0x1F964, // cup with straw
                0x1F377, // wine
                0x1F37A, // beer
                0x2615,  // coffee
                0x1F966, // broccoli
                0x1F955, // carrot
                0x1F34E, // apple
                0x1F34C, // banana
                0x1F95A, // egg
                0x1F35E, // bread
                0x1F9C0, // cheese
                0x1F36B, // chocolate
                0x1F37F, // popcorn
                0x1F957  // salad
            ])),
            ("Транспорт", e([
                0x1F697, // car
                0x1F695, // taxi
                0x26FD,  // fuel pump
                0x1F68C, // bus
                0x1F687, // metro
                0x1F6A2, // ship
                0x1F3CD, // motorcycle
                0x1F6B2, // bicycle
                0x1F6F4, // scooter
                0x1F681, // helicopter
                0x1F682, // train
                0x1F6FB, // pickup truck
                0x1F699  // SUV
            ])),
            ("Дом", e([
                0x1F3E0, // house
                0x1F4A1, // light bulb
                0x1F527, // wrench
                0x1F6BF, // shower
                0x1F6CF, // bed
                0x1F4E6, // package
                0x1F511, // key
                0x1F3D7, // building construction
                0x1F9F9, // broom
                0x1F9FA  // basket
            ])),
            ("Финансы", e([
                0x1F4B0, // money bag
                0x1F4B3, // credit card
                0x1F3E6, // bank
                0x1F4CA, // bar chart
                0x1F4B8, // money with wings
                0x1FA99, // coin
                0x1F4C8, // chart increasing
                0x1F4B5, // dollar
                0x1F48E, // gem
                0x1F4B2, // dollar sign
                0x1F4C9, // chart decreasing
                0x1F9FE, // receipt
                0x1F4CB  // clipboard
            ])),
            ("Здоровье", e([
                0x1F48A, // pill
                0x1F3E5, // hospital
                0x1FA7A, // stethoscope
                0x1F9B7, // tooth
                0x1F453, // glasses
                0x1F489, // syringe
                0x1FA79, // bandage
                0x1F3CB, // weightlifter
                0x1F9D8, // yoga
                0x1F691  // ambulance
            ])),
            ("Развлечения", e([
                0x1F3AC, // clapper
                0x1F3AE, // video game
                0x1F3B5, // music note
                0x1F4F1, // phone
                0x1F4BB, // laptop
                0x1F4FA, // TV
                0x1F3AD, // theater masks
                0x1F3A4, // microphone
                0x1F3AF, // direct hit
                0x1F3B2, // dice
                0x1F3B8, // guitar
                0x1F4F8, // camera
                0x1F3A8  // artist palette
            ])),
            ("Покупки", e([
                0x1F6CD, // shopping bags
                0x1F455, // t-shirt
                0x1F457, // dress
                0x1F45F, // sneaker
                0x1F381, // gift
                0x1F484, // lipstick
                0x1F45C, // handbag
                0x231A,  // watch
                0x1F576, // sunglasses
                0x1F9F4, // lotion
                0x1F9F8  // teddy bear
            ])),
            ("Образование", e([
                0x1F4DA, // books
                0x1F393, // cap
                0x270F,  // pencil
                0x1F4DD, // memo
                0x1F5A5, // desktop
                0x1F52C, // microscope
                0x1F4D6, // open book
                0x1F4D0, // triangular ruler
                0x1F5C2, // dividers
                0x1F3EB  // school
            ])),
            ("Животные", e([
                0x1F436, // dog
                0x1F431, // cat
                0x1F439, // hamster
                0x1F430, // rabbit
                0x1F41F, // fish
                0x1F426, // bird
                0x1F434, // horse
                0x1F422  // turtle
            ])),
            ("Прочее", e([
                0x1F4CC, // pushpin
                0x2B50,  // star
                0x1F514, // bell
                0x1F3F7, // label
                0x1F4CE, // paperclip
                0x1F5D1, // wastebasket
                0x1F4E9, // envelope
                0x1F512, // lock
                0x1F4BC, // briefcase
                0x1F3C6, // trophy
                0x2699,  // gear
                0x2753   // question mark
            ]))
        ]
    }()

    private var filteredEmojis: [(title: String, emojis: [String])] {
        if searchText.isEmpty {
            return Self.emojiGroups
        }
        let filtered = Self.emojiGroups.filter {
            $0.title.localizedCaseInsensitiveContains(searchText)
        }
        return filtered.isEmpty ? Self.emojiGroups : filtered
    }

    var body: some View {
        VStack(spacing: 12) {
            // Поле поиска
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Поиск по группе", text: $searchText)
                    .textFieldStyle(.plain)
            }
            .padding(10)
            .background(Color(.tertiarySystemGroupedBackground))
            .clipShape(RoundedRectangle(cornerRadius: 10))

            // Сетка emoji
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 16) {
                    ForEach(filteredEmojis, id: \.title) { group in
                        VStack(alignment: .leading, spacing: 6) {
                            Text(group.title)
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundStyle(.secondary)

                            LazyVGrid(
                                columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7),
                                spacing: 6
                            ) {
                                ForEach(group.emojis, id: \.self) { emoji in
                                    Button {
                                        selectedEmoji = emoji
                                    } label: {
                                        Text(emoji)
                                            .font(.system(size: 28))
                                            .frame(width: 42, height: 42)
                                            .background(
                                                selectedEmoji == emoji
                                                    ? Color.accentColor.opacity(0.2)
                                                    : Color.clear
                                            )
                                            .clipShape(RoundedRectangle(cornerRadius: 8))
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
