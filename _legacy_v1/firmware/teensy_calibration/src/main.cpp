#include <stdint.h>
#include "soc/gpio_reg.h"
#include "soc/io_mux_reg.h"
#include "soc/gpio_struct.h"
#include "esp_rom_sys.h"

/**
 * ESP32-S3 Bare Metal Register Blinky
 * Target: ESP32-S3-Box-3
 * 
 * Register Logic:
 * - GPIO_ENABLE_REG: Enables output for the specific GPIO.
 * - GPIO_OUT_W1TS_REG: Atomic Set (Write 1 to Set).
 * - GPIO_OUT_W1TC_REG: Atomic Clear (Write 1 to Clear).
 */

#define BLINK_GPIO 1  // Target GPIO 1 (Change to 39 for Box-3 WS2812 Data Pin)

extern "C" void app_main(void) {
    // 1. Configure the IO MUX for the GPIO
    // We need to set the pin to its GPIO function (typically Function 1 on S3).
    // Using the SOC macro to calculate the register address.
    uint32_t *io_mux_reg = (uint32_t *)GPIO_PIN_MUX_REG[BLINK_GPIO];
    
    // Reset the IO MUX register for this pin and set to GPIO mode
    // Bit 12-14 usually define the MCU_SEL (Function). 1 = GPIO.
    *io_mux_reg = (1 << MCU_SEL_S); 

    // 2. Enable Output for the GPIO
    // The GPIO_ENABLE_REG (0x60004020) handles GPIO 0-31.
    // For GPIO 32+, use GPIO_ENABLE1_REG.
    if (BLINK_GPIO < 32) {
        REG_WRITE(GPIO_ENABLE_REG, REG_READ(GPIO_ENABLE_REG) | (1 << BLINK_GPIO));
    } else {
        REG_WRITE(GPIO_ENABLE1_REG, REG_READ(GPIO_ENABLE1_REG) | (1 << (BLINK_GPIO - 32)));
    }

    while (1) {
        // 3. Set GPIO HIGH (Atomic Set)
        if (BLINK_GPIO < 32) {
            REG_WRITE(GPIO_OUT_W1TS_REG, (1 << BLINK_GPIO));
        } else {
            REG_WRITE(GPIO_OUT1_W1TS_REG, (1 << (BLINK_GPIO - 32)));
        }

        // Delay using ROM function (Bare metal delay)
        esp_rom_delay_us(500000);

        // 4. Set GPIO LOW (Atomic Clear)
        if (BLINK_GPIO < 32) {
            REG_WRITE(GPIO_OUT_W1TC_REG, (1 << BLINK_GPIO));
        } else {
            REG_WRITE(GPIO_OUT1_W1TC_REG, (1 << (BLINK_GPIO - 32)));
        }

        esp_rom_delay_us(500000);
    }
}