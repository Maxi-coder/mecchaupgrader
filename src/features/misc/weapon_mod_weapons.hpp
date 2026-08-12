#pragma once

#include <Windows.h>
#include <map>
#include <string>

namespace weapon_mod_weapons {
    struct weapon_entry {
        DWORD hash;
        const char* label;
    };

    static constexpr DWORD k_none_hash = 0u;

    inline constexpr weapon_entry k_entries[] = {
        { 0xBFE256D4u, "Pistol Mk II" },
        { 0xD205520Eu, "Heavy Pistol" },
        { 0xC1B3C3D1u, "Heavy Revolver" },
        { 0xCB96392Fu, "Heavy Revolver Mk II" },
        { 0x97EA20B8u, "Double Action Revolver" },
        { 0x917F6C8Cu, "Navy Revolver" },
        { 0x3AABBBAAu, "Heavy Shotgun" },
        { 0xA89CB99Eu, "Musket" },
        { 0x83BF0278u, "Carbine Rifle" },
        { 0xFAD1F1C9u, "Carbine Rifle Mk II" },
        { 0xC0A3098Du, "Special Carbine" },
        { 0x969C3D67u, "Special Carbine Mk II" },
        { 0x9D07F764u, "MG" },
        { 0x7FD62962u, "Combat MG" },
        { 0xDBBD7280u, "Combat MG Mk II" },
        { 0x0C472FE2u, "Heavy Sniper" },
        { 0x0A914799u, "Heavy Sniper Mk II" },
        { 0xC734385Au, "Marksman Rifle" },
        { 0x6A6C02E0u, "Marksman Rifle Mk II" },
        { 0x6E7DDDECu, "Precision Rifle" },
    };

    inline std::map<DWORD, std::string> default_selected() {
        std::map<DWORD, std::string> selected;
        for (const auto& weapon : k_entries) {
            selected[weapon.hash] = "1";
        }
        return selected;
    }

    inline bool is_allowed(DWORD hash) {
        for (const auto& weapon : k_entries) {
            if (weapon.hash == hash) return true;
        }
        return false;
    }

    inline bool is_selected(const std::map<DWORD, std::string>& selected, DWORD hash) {
        if (!is_allowed(hash)) return false;
        if (selected.find(k_none_hash) != selected.end()) return false;

        const auto it = selected.find(hash);
        return it != selected.end() && it->second == "1";
    }
}
