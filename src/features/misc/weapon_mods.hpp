#pragma once

#include "features/misc/weapon_mod_weapons.hpp"

#include <map>

namespace weapon_mods {
    inline std::map<uintptr_t, float> default_time_to_shoot;

    inline bool valid_weapon_info(CWeaponInfo* info) {
        const uintptr_t ptr = reinterpret_cast<uintptr_t>(info);
        return ptr > 0x10000 && ptr < 0x7FFFFFFFFFFF && IsValidPtr(info);
    }

    inline void restore_time_entry(uintptr_t ptr, float value) {
        __try {
            CWeaponInfo* info = reinterpret_cast<CWeaponInfo*>(ptr);
            if (!valid_weapon_info(info)) return;
            info->setTimeToShoot(value);
        }
        __except (EXCEPTION_EXECUTE_HANDLER) {
        }
    }

    inline void restore_double_shoot(CWeaponInfo* info) {
        if (!valid_weapon_info(info)) return;
        const uintptr_t ptr = reinterpret_cast<uintptr_t>(info);
        const auto it = default_time_to_shoot.find(ptr);
        if (it == default_time_to_shoot.end()) return;

        restore_time_entry(ptr, it->second);
        default_time_to_shoot.erase(it);
    }

    inline void restore_all_double_shoot() {
        for (const auto& [ptr, value] : default_time_to_shoot) {
            restore_time_entry(ptr, value);
        }
        default_time_to_shoot.clear();
    }

    inline bool selected(const char* key, DWORD hash) {
        const std::map<DWORD, std::string> selected_weapons =
            config::get("hacks", key, weapon_mod_weapons::default_selected());
        return weapon_mod_weapons::is_selected(selected_weapons, hash);
    }

    inline void apply_double_shoot(CWeaponInfo* info, DWORD hash) {
        if (!valid_weapon_info(info) || !selected("double_shoot_weapons", hash)) {
            restore_double_shoot(info);
            return;
        }

        const uintptr_t ptr = reinterpret_cast<uintptr_t>(info);
        if (default_time_to_shoot.find(ptr) == default_time_to_shoot.end()) {
            default_time_to_shoot[ptr] = info->getTimeToShoot();
        }

        info->setTimeToShoot(0.f);
    }
}
