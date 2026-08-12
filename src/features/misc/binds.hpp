#pragma once
#include "core/imports.h"
#include "config/bind_state.hpp"
#include <cmath>
#include <algorithm>
#include <chrono>
#include "imgui.h"

#undef min
#undef max

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif
#ifndef PI
#define PI 3.14159265358979323846
#endif
#ifndef M_PI_2
#define M_PI_2 1.57079632679489661923
#endif

static const bind_state::bind_config k_godmode_bind {
    "hacks",
    "godmode",
    "god_key",
    "godmode_key",
    "god_key_mode",
    "godmode_mode"
};

static const bind_state::bind_config k_noclip_bind {
    "hacks",
    "noclip",
    "noclip_key",
    "noclip_key",
    "noclip_key_mode",
    "noclip_mode"
};

static const bind_state::bind_config k_freecam_bind {
    "hacks",
    "freecam",
    "Freecam_key",
    "freecam_key",
    "Freecam_key_mode",
    "freecam_mode"
};

static const bind_state::bind_config k_clickwarp_bind {
    "hacks",
    "clickwarp",
    "clickwarp_key",
    "clickwarp_key",
    "clickwarp_key_mode",
    "clickwarp_mode"
};

static const bind_state::bind_config k_skip_anim_bind {
    "hacks",
    "skip_anim_enable",
    "skip_anim_key",
    "skip_anim_key",
    "skip_anim_key_mode",
    "skip_anim_mode"
};

static const bind_state::bind_config k_veh_boost_bind {
    "hacks",
    "veh_boost_enabled",
    "veh_boost_key",
    "veh_boost_key",
    "veh_boost_key_mode",
    "veh_boost_mode"
};

static const bind_state::bind_config k_veh_fast_stop_bind {
    "hacks",
    "veh_fast_stop_enabled",
    "veh_fast_stop_key",
    "veh_fast_stop_key",
    "veh_fast_stop_key_mode",
    "veh_fast_stop_mode"
};

static const bind_state::bind_config k_double_shoot_bind {
    "hacks",
    "double_shoot",
    "double_shoot_key",
    "double_shoot_key",
    "double_shoot_key_mode",
    "double_shoot_mode"
};

namespace hacks {
    inline bool unsafe_mode_enabled() {
        return config::get("misc", "unsafe_mode", 0) != 0;
    }
}

using Hash = uint32_t;
namespace game {
    extern vector<pair<CObject*, DataPed>> ped_list;
    extern vector<CObject*> object_list;
    extern vector<CVehicle*> vehicle_list;
    extern bool isValidPlayer(DWORD hash, CObject* player);
    extern DWORD freemode_f;
    extern DWORD freemode_m;
    extern vector<CVehicle*> nearby_vehicle_list;
}
Vector3 lerp(const Vector3& a, const Vector3& b, float t) {
    return Vector3{
        a.x + (b.x - a.x) * t,
        a.y + (b.y - a.y) * t,
        a.z + (b.z - a.z) * t
    };
}
