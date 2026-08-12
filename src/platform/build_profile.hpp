#pragma once

namespace build_profile {
#if defined(NOCTUA_DEBUG_BUILD)
    inline constexpr bool debug = true;
    inline constexpr bool production = false;
#else
    inline constexpr bool debug = false;
    inline constexpr bool production = true;
#endif
}
