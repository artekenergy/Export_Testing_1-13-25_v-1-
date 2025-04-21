;(() => {
  // --------------------------
  // Cached DOM Elements
  // --------------------------
  const connectionStatus = document.getElementById("connection-status")
  const connectBtn = document.getElementById("connect-btn")
  const disconnectBtn = document.getElementById("disconnect-btn")
  const toggleButtons = document.querySelectorAll(".toggle-btn")
  const momentaryButtons = document.querySelectorAll(".momentary-btn")
  const logElement = document.getElementById("log")

  // --------------------------
  // WebSocket & Heartbeat Setup
  // --------------------------
  let socket = null
  const HEARTBEAT_INTERVAL = 5000 // 5 sec heartbeat
  let heartbeatInterval = null
  let heartbeatTimer = null

  // Helper: Check if socket is open
  const isSocketOpen = () => socket && socket.readyState === WebSocket.OPEN

  // --------------------------
  // Logging Utility
  // --------------------------
  const log = (message) => {
    const entry = document.createElement("div")
    entry.textContent = `${new Date().toLocaleTimeString()} - ${message}`
    logElement?.appendChild(entry)
    if (logElement) logElement.scrollTop = logElement.scrollHeight
  }

  // --------------------------
  // WebSocket Connection Functions
  // --------------------------
  function connectWebSocket() {
    const host = document.getElementById("ws-host")?.value || "172.16.11.7"
    const port = document.getElementById("ws-port")?.value || "8888"
    if (isSocketOpen()) socket.close()
    const wsUrl = `ws://${host}:${port}/ws`
    log(`Connecting to ${wsUrl}...`)

    try {
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        connectionStatus.textContent = `Connected to ${wsUrl}`
        connectionStatus.className = "connection-status connected"
        log("Connection established")
        startHeartbeat()
      }

      socket.onmessage = (event) => {
        log(`Received: ${event.data}`)
        try {
          const packet = JSON.parse(event.data)

          // Handle heartbeat ping from server
          if (
            packet.messagecmd === 5 &&
            packet.messagetype === 48 &&
            packet.size === 0
          ) {
            sendPong()
            log("Responding to server heartbeat")
            return
          }

          // Handle NMEA 2000 data
          if (packet.messagetype === 82) {
            // NMEA message type
            const decodedData = decoder.decodeN2KDataItem(packet)
            if (decodedData) {
              log(
                `Decoded NMEA Signal: ID=${decodedData.signalId}, Value=${decodedData.value}`
              )
              handleDecodedSignal(decodedData)
            }
          }

          // Handle MFD channel data
          if (packet.messagetype === 16) {
            // MFD status
            const decodedData = decoder.decodeMFDChannelItem(packet)
            if (decodedData) {
              log(
                `Decoded MFD Signal: ID=${decodedData.signalId}, Value=${decodedData.value}`
              )
              handleDecodedSignal(decodedData)
            }
          }
        } catch (e) {
          console.error("Error processing WebSocket message:", e)
        }
      }

      socket.onclose = () => {
        connectionStatus.textContent = "Disconnected"
        connectionStatus.className = "connection-status disconnected"
        log("Connection closed")
        stopHeartbeat()
      }

      socket.onerror = (error) => {
        connectionStatus.textContent = "Connection error"
        connectionStatus.className = "connection-status disconnected"
        log("Error: " + error)
      }
    } catch (error) {
      log("Failed to connect: " + error)
    }
  }

  function startHeartbeat() {
    stopHeartbeat() // clear any existing heartbeat
    heartbeatInterval = setInterval(() => {
      if (isSocketOpen()) sendHeartbeat()
    }, HEARTBEAT_INTERVAL)
  }

  function stopHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    heartbeatInterval = null
    if (heartbeatTimer) clearTimeout(heartbeatTimer)
    heartbeatTimer = null
  }

  function sendHeartbeat() {
    if (!isSocketOpen()) return
    const heartbeat = { messagetype: 48, messagecmd: 5, size: 0, data: [] }
    log("Sending heartbeat")
    socket.send(JSON.stringify(heartbeat))
  }

  function sendPong() {
    if (!isSocketOpen()) return
    const pong = { messagetype: 128, messagecmd: 0, size: 1, data: [0] }
    socket.send(JSON.stringify(pong))
  }

  const DataTypes = {
    int8: 5,
    uint8: 4,
    int16: 3,
    uint16: 2,
    int32: 1,
    uint32: 0,
    int64: 7,
    uint64: 6,
  }

  // Add the decoder class
  class SignalDecoder {
    constructor() {
      this.signalInfoMap = new Map()
    }

    decodeN2KDataItem(packet) {
      if (packet.messagecmd === 1) {
        // statusUpdate
        const signalId = packet.data[0] | (packet.data[1] << 8)
        return {
          signalId: signalId,
          valueTypeIdentifier: packet.data[3] | (packet.data[4] << 8),
          value: this._getValue(signalId, packet.data, 5),
        }
      }
      return null
    }

    _getValue(signalId, data, offset) {
      const array = new Uint8Array(data)
      const view = new DataView(array.buffer)

      // Get data type from signal info or default to int32
      const dataType =
        this.signalInfoMap.get(signalId)?.dataType || DataTypes.int32

      switch (dataType) {
        case DataTypes.int8:
          return view.getInt8(offset)
        case DataTypes.uint8:
          return view.getUint8(offset)
        case DataTypes.int16:
          return view.getInt16(offset, true)
        case DataTypes.uint16:
          return view.getUint16(offset, true)
        case DataTypes.int32:
          return view.getInt32(offset, true)
        case DataTypes.uint32:
          return view.getUint32(offset, true)
        case DataTypes.int64:
          return Number(view.getBigInt64(offset, true))
        case DataTypes.uint64:
          return Number(view.getBigUint64(offset, true))
      }
    }
  }

  // Create an instance of the decoder
  const decoder = new SignalDecoder()

  // Modify your existing WebSocket onmessage handler
  socket.onmessage = (event) => {
    log(`Received: ${event.data}`)
    try {
      const packet = JSON.parse(event.data)

      // Handle heartbeat ping from server
      if (
        packet.messagecmd === 5 &&
        packet.messagetype === 48 &&
        packet.size === 0
      ) {
        sendPong()
        log("Responding to server heartbeat")
        return
      }

      // Handle NMEA 2000 data
      if (packet.messagetype === 82) {
        // NMEA message type
        const decodedData = decoder.decodeN2KDataItem(packet)
        if (decodedData) {
          log(
            `Decoded NMEA Signal: ID=${decodedData.signalId}, Value=${decodedData.value}`
          )
          handleDecodedSignal(decodedData)
        }
      }
    } catch (e) {
      console.error("Error processing WebSocket message:", e)
    }
  }

  // Add a handler for decoded signals
  function handleDecodedSignal(signal) {
    // Track the signal
    signalMonitor.trackSignal(
      signal.signalId,
      signal.value,
      signal.valueTypeIdentifier ? "NMEA" : "MFD"
    )

    // Update signal in manager (existing code)
    signalManager.updateSignal(signal.signalId, signal.value)
    // Update UI elements based on signal ID and value
    // Example:
    const element = document.querySelector(
      `[data-signal-id="${signal.signalId}"]`
    )
    if (element) {
      if (element.classList.contains("signalvalue")) {
        element.textContent = signal.value.toString()
      } else if (element.classList.contains("toggle-btn")) {
        element.classList.toggle("active", Boolean(signal.value))
      }
    }
  }

  // Add these utility functions
  function showSignalMonitor() {
    // Create or get monitor overlay
    let monitorOverlay = document.getElementById("signal-monitor")
    if (!monitorOverlay) {
      monitorOverlay = document.createElement("div")
      monitorOverlay.id = "signal-monitor"
      monitorOverlay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0,0,0,0.8);
            color: #fff;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 9999;
        `
      document.body.appendChild(monitorOverlay)
    }

    // Update monitor content
    function updateMonitor() {
      const signals = signalMonitor.getAllSignals()
      monitorOverlay.innerHTML = `
            <h3>Active Signals (${signals.length})</h3>
            <table style="border-collapse: collapse;">
                <tr>
                    <th style="padding: 5px; border: 1px solid #444;">ID</th>
                    <th style="padding: 5px; border: 1px solid #444;">Value</th>
                    <th style="padding: 5px; border: 1px solid #444;">Type</th>
                    <th style="padding: 5px; border: 1px solid #444;">Updates</th>
                    <th style="padding: 5px; border: 1px solid #444;">Last Update</th>
                </tr>
                ${signals
                  .map(
                    (s) => `
                    <tr>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.id
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.value
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.type
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${
                          s.updateCount
                        }</td>
                        <td style="padding: 5px; border: 1px solid #444;">${s.timeSinceUpdate.toFixed(
                          1
                        )}s</td>
                    </tr>
                `
                  )
                  .join("")}
            </table>
        `
    }

    // Update every second
    const monitorInterval = setInterval(updateMonitor, 1000)

    // Add close button
    const closeBtn = document.createElement("button")
    closeBtn.textContent = "Close Monitor"
    closeBtn.style.marginTop = "10px"
    closeBtn.onclick = () => {
      clearInterval(monitorInterval)
      monitorOverlay.remove()
    }
    monitorOverlay.appendChild(closeBtn)
  }

  // Create signal manager instance
  const signalManager = new SignalManager()

  // Modify the existing handleDecodedSignal function
  function handleDecodedSignal(signal) {
    // Update signal in manager
    signalManager.updateSignal(signal.signalId, signal.value)

    // Update UI elements based on signal ID and value
    const elements = document.querySelectorAll(
      `[data-signal-id="${signal.signalId}"]`
    )
    elements.forEach((element) => {
      if (element.classList.contains("signalvalue")) {
        element.textContent = signal.value.toString()
      } else if (element.classList.contains("toggle-btn")) {
        element.classList.toggle("active", Boolean(signal.value))
      } else if (element.classList.contains("slider")) {
        element.value = signal.value
        const valueDisplay = element.nextElementSibling
        if (valueDisplay?.classList.contains("slider-value")) {
          valueDisplay.textContent = `${signal.value}%`
        }
      }
    })
  }
  // Signal monitoring and debugging
  class SignalMonitor {
    constructor() {
      this.signals = new Map()
      this.lastUpdateTime = new Map()
    }

    // Track incoming signal
    trackSignal(signalId, value, type = "unknown") {
      this.signals.set(signalId, {
        value,
        type,
        lastUpdate: new Date(),
        updateCount: (this.signals.get(signalId)?.updateCount || 0) + 1,
      })
    }

    // Get all tracked signals
    getAllSignals() {
      return Array.from(this.signals.entries()).map(([id, data]) => ({
        id,
        ...data,
        timeSinceUpdate: (new Date() - data.lastUpdate) / 1000,
      }))
    }

    // Print signal summary to console
    printSignalSummary() {
      console.group("Active Signals Summary")
      console.table(this.getAllSignals())
      console.groupEnd()
    }
  }

  // --------------------------
  // Command Sending Functions
  // --------------------------
  function sendToggleButtonCommand(id, state) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 0,
      size: 3,
      data: [id, 0, state ? 3 : 5], // ON = 3, OFF = 5
    }
    log(`Sending toggle button ${id} command: ${state ? "ON" : "OFF"}`)
    socket.send(JSON.stringify(command))
  }

  function sendButtonCommand(id, state) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 1,
      size: 3,
      data: [id, 0, state ? 1 : 0],
    }
    log(`Sending button ${id} command: ${state ? "ON" : "OFF"}`)
    socket.send(JSON.stringify(command))
  }

  function sendSliderCommand(id, value) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 3,
      size: 5,
      data: [id, 0, 0, value & 0xff, (value >> 8) & 0xff],
    }
    log(`Setting slider ${id} to value: ${value}`)
    socket.send(JSON.stringify(command))
  }

  function sendThermostatCommand(temp) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [30, 0, temp],
    }
    log(`Setting thermostat to ${temp}°F`)
    socket.send(JSON.stringify(command))
  }

  // Zone-related commands (RGB, brightness, mode, warmth)
  function sendZoneRgbCommand(zone, colorHex) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const r = parseInt(colorHex.substring(1, 3), 16)
    const g = parseInt(colorHex.substring(3, 5), 16)
    const b = parseInt(colorHex.substring(5, 7), 16)
    const zoneOffset = 100 + parseInt(zone, 10)
    const command = {
      messagetype: 17,
      messagecmd: 6,
      size: 5,
      data: [zoneOffset, r, g, b, 0],
    }
    log(`Setting Zone ${zone} RGB to: R=${r}, G=${g}, B=${b}`)
    socket.send(JSON.stringify(command))
  }

  function sendZoneBrightnessCommand(zone, brightness) {
    if (!isSocketOpen()) return
    const zoneOffset = 200 + parseInt(zone, 10)
    const command = {
      messagetype: 17,
      messagecmd: 3,
      size: 5,
      data: [zoneOffset, 0, 0, brightness & 0xff, (brightness >> 8) & 0xff],
    }
    log(`Setting Zone ${zone} brightness to: ${brightness}%`)
    socket.send(JSON.stringify(command))
  }

  function sendZoneModeCommand(zone, mode) {
    if (!isSocketOpen()) return
    const zoneOffset = 300 + parseInt(zone, 10)
    const modeValue = mode === "rgb" ? 1 : 2
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [zoneOffset, 0, modeValue],
    }
    log(`Setting Zone ${zone} mode to: ${mode}`)
    socket.send(JSON.stringify(command))
  }

  function sendZoneWarmthCommand(zone, temperature) {
    if (!isSocketOpen()) return
    let r, g, b
    // Simplified color conversion based on temperature
    if (temperature <= 4600) {
      const factor = (temperature - 2700) / (4600 - 2700)
      r = 255
      g = Math.round(255 * factor)
      b = Math.round(190 * factor)
    } else {
      const factor = (temperature - 4600) / (6500 - 4600)
      r = Math.round(255 * (1 - factor * 0.3))
      g = Math.round(255 * (1 - factor * 0.1))
      b = 255
    }
    const zoneOffset = 100 + parseInt(zone, 10)
    const command = {
      messagetype: 17,
      messagecmd: 7,
      size: 5,
      data: [zoneOffset, r, g, b, 1], // '1' indicates white mode
    }
    log(
      `Setting Zone ${zone} temperature to: ${temperature}K (R=${r}, G=${g}, B=${b})`
    )
    socket.send(JSON.stringify(command))
  }

  function sendAcLimitCommand(limit) {
    if (!isSocketOpen()) return
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [12, 0, limit],
    }
    log(`Setting AC input limit to: ${limit}A`)
    socket.send(JSON.stringify(command))
  }

  // Fan speed command (using a given command ID)
  function sendFanSpeedCommand(commandId, speed) {
    if (!isSocketOpen()) return
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [commandId, 0, speed],
    }
    log(`Setting fan speed (ID: ${commandId}) to: ${speed}`)
    socket.send(JSON.stringify(command))
  }

  function sendVentTimerCommand(time) {
    if (!isSocketOpen()) return
    const command = {
      messagetype: 17,
      messagecmd: 4,
      size: 3,
      data: [68, 0, time],
    }
    log(`Setting vent timer to: ${time} minutes`)
    socket.send(JSON.stringify(command))
  }

  function sendRgbCommand(r, g, b) {
    if (!isSocketOpen()) {
      log("Not connected to WebSocket server")
      return
    }
    const command = {
      messagetype: 17,
      messagecmd: 6,
      size: 5,
      data: [45, r, g, b, 0],
    }
    log(`Setting RGB to: R=${r}, G=${g}, B=${b}`)
    socket.send(JSON.stringify(command))
  }

  // --------------------------
  // UI Setup Functions
  // --------------------------
  function initializeButtons() {
    // Connect/disconnect
    connectBtn?.addEventListener("click", connectWebSocket)
    disconnectBtn?.addEventListener("click", () => {
      if (socket) {
        socket.close()
        stopHeartbeat()
      }
    })
    // Toggle buttons
    toggleButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const componentId = parseInt(btn.dataset.id, 10)
        const isActive = btn.classList.toggle("active")
        sendToggleButtonCommand(componentId, isActive)
      })
    })
    // Momentary buttons
    momentaryButtons.forEach((btn) => {
      btn.addEventListener("mousedown", () => {
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, true)
        btn.classList.add("active")
      })
      btn.addEventListener("mouseup", () => {
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, false)
        btn.classList.remove("active")
      })
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault()
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, true)
        btn.classList.add("active")
      })
      btn.addEventListener("touchend", (e) => {
        e.preventDefault()
        const id = parseInt(btn.dataset.id, 10)
        sendButtonCommand(id, false)
        btn.classList.remove("active")
      })
    })
    // MultiPlus buttons (mutually exclusive group)
    const multiplusBtns = document.querySelectorAll(".multiplus-btn")
    multiplusBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        multiplusBtns.forEach((b) => b.classList.remove("active"))
        this.classList.add("active")
        const mode = this.getAttribute("data-mode")
        const componentId = parseInt(this.getAttribute("data-id"), 10)
        // Use a mapping instead of a switch for clarity
        const modeMap = { on: 1, off: 0, charger: 2 }
        const modeValue = modeMap[mode] ?? 0
        if (isSocketOpen()) {
          const command = {
            messagetype: 17,
            messagecmd: 4,
            size: 3,
            data: [componentId, 0, modeValue],
          }
          log(`Setting MultiPlus mode to: ${mode}`)
          socket.send(JSON.stringify(command))
        }
      })
    })
  }

  function setupSliders() {
    const sliders = document.querySelectorAll("input[type='range']")
    sliders.forEach((slider) => {
      const valueDisplay = slider.nextElementSibling
      if (valueDisplay?.classList.contains("slider-value")) {
        slider.addEventListener("input", () => {
          const value = slider.value
          valueDisplay.textContent = `${value}%`
          const sliderId = slider.id || "slider"
          sendSliderCommand(getSliderCommandId(sliderId), parseInt(value, 10))
        })
      }
    })
  }

  function getSliderCommandId(sliderId) {
    const sliderMap = {
      "fan-speed": 20,
      "interior-main": 41,
      "interior-reading": 42,
      "exterior-awning": 43,
      "rgb-brightness": 44,
    }
    return sliderMap[sliderId] || 2
  }

  function setupMainTabs() {
    const tabButtons = document.querySelectorAll(".tab-button")
    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".tab-button")
          .forEach((btn) => btn.classList.remove("active"))
        document
          .querySelectorAll(".tab-content")
          .forEach((content) => content.classList.remove("active"))
        button.classList.add("active")
        const tabId = button.getAttribute("data-tab") + "-tab"
        const tabContent = document.getElementById(tabId)
        if (tabContent) {
          tabContent.classList.add("active")
          console.log("Activated tab:", tabId)
        } else {
          console.error("Tab content not found:", tabId)
        }
      })
    })
  }

  function setupHvacTabs() {
    const hvacTabButtons = document.querySelectorAll(".hvac-tab-button")
    hvacTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".hvac-tab-button")
          .forEach((btn) => btn.classList.remove("active"))
        document
          .querySelectorAll(".hvac-tab-content")
          .forEach((tab) => tab.classList.remove("active"))
        button.classList.add("active")
        const tabId = button.getAttribute("data-hvac-tab") + "-tab"
        document.getElementById(tabId)?.classList.add("active")
      })
    })
  }

  function setupLightingTabs() {
    const lightingTabButtons = document.querySelectorAll(".lighting-tab-button")
    const modeLabel = document.querySelector(".lighting-mode-label")
    lightingTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".lighting-tab-button")
          .forEach((btn) => btn.classList.remove("active"))
        document
          .querySelectorAll(".lighting-tab-content")
          .forEach((tab) => tab.classList.remove("active"))
        button.classList.add("active")
        const tabId = button.getAttribute("data-lighting-tab") + "-tab"
        document.getElementById(tabId)?.classList.add("active")
        if (modeLabel) {
          modeLabel.textContent = "Current Mode: " + button.textContent.trim()
        }
      })
    })
    // Setup color picker if present
    const colorPicker = document.getElementById("rgb-color")
    colorPicker?.addEventListener("input", () => {
      const color = colorPicker.value
      sendRgbCommand(
        parseInt(color.substring(1, 3), 16),
        parseInt(color.substring(3, 5), 16),
        parseInt(color.substring(5, 7), 16)
      )
    })
  }

  function setupRgbZones() {
    // Zone tab navigation
    const zoneButtons = document.querySelectorAll(".rgb-zone-button")
    zoneButtons.forEach((button) => {
      button.addEventListener("click", () => {
        document
          .querySelectorAll(".rgb-zone-button")
          .forEach((btn) => btn.classList.remove("active"))
        document
          .querySelectorAll(".rgb-zone-content")
          .forEach((content) => content.classList.remove("active"))
        button.classList.add("active")
        const zoneId = button.getAttribute("data-zone-tab") + "-tab"
        document.getElementById(zoneId)?.classList.add("active")
      })
    })
    // Setup per-zone color pickers
    document.querySelectorAll(".zone-color-picker").forEach((picker) => {
      const zone = picker.getAttribute("data-zone")
      picker.addEventListener("input", () => {
        updateColorSlider(zone, picker.value)
        sendZoneRgbCommand(zone, picker.value)
      })
    })

    // After setting up event listeners, select the default (Zone 1) if none is active:
    const defaultZoneButton = document.querySelector(
      ".rgb-zone-button[data-zone-tab='zone1']"
    )
    if (defaultZoneButton) {
      defaultZoneButton.click() // Programmatically trigger click to set it active.
    }
    // Setup brightness sliders for zones
    document.querySelectorAll('[id^="brightness-zone"]').forEach((slider) => {
      const zone = slider.getAttribute("data-zone")
      const valueDisplay = slider.nextElementSibling
      slider.addEventListener("input", () => {
        const brightness = slider.value
        if (valueDisplay) valueDisplay.textContent = `${brightness}%`
        sendZoneBrightnessCommand(zone, parseInt(brightness, 10))
      })
    })
    // Setup mode toggles and warmth sliders for zones
    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const zone = btn.getAttribute("data-zone")
        const mode = btn.getAttribute("data-mode")
        document
          .querySelectorAll(`.mode-btn[data-zone="${zone}"]`)
          .forEach((b) => b.classList.remove("active"))
        btn.classList.add("active")
        const colorPicker = document.getElementById(`rgb-color-zone${zone}`)
        if (colorPicker) {
          const colorContainer = colorPicker.closest(".color-selector")
          colorContainer.style.opacity = mode === "rgb" ? "1" : "0.3"
          colorContainer.style.pointerEvents = mode === "rgb" ? "auto" : "none"
        }
        const zoneContainer = document.getElementById(`zone${zone}-tab`)
        if (zoneContainer) {
          const rgbGroup = zoneContainer.querySelector(
            `.slider-group[data-slider-type="rgb"]`
          )
          const warmthGroup = zoneContainer.querySelector(
            `.slider-group[data-slider-type="white"]`
          )
          if (rgbGroup)
            rgbGroup.style.display = mode === "rgb" ? "block" : "none"
          if (warmthGroup)
            warmthGroup.style.display = mode === "white" ? "block" : "none"
        }
        sendZoneModeCommand(zone, mode)
      })
    })
    document.querySelectorAll(".warmth-slider").forEach((slider) => {
      const zone = slider.getAttribute("data-zone")
      const valueDisplay = slider.nextElementSibling
      slider.addEventListener("input", () => {
        const warmth = slider.value
        if (valueDisplay) {
          valueDisplay.textContent = `${warmth}K`
        }
        sendZoneWarmthCommand(zone, parseInt(warmth, 10))
      })
    })
    // Initialize color sliders based on preset values
    for (let i = 1; i <= 4; i++) {
      const picker = document.getElementById(`rgb-color-zone${i}`)
      if (picker) updateColorSlider(i, picker.value)
    }
  }

  function setupThermostat() {
    const tempSlider = document.getElementById("temp-slider")
    const targetTemp = document.getElementById("target-temp")
    if (!tempSlider || !targetTemp) return
    tempSlider.addEventListener("input", () => {
      targetTemp.textContent = `${tempSlider.value}°F`
    })
    tempSlider.addEventListener("change", () =>
      sendThermostatCommand(parseInt(tempSlider.value, 10))
    )
  }

  function setupVentControls() {
    // Setup fan speed controls for different vent groups
    setupFanSpeedControl("vent-fan", 63)
    setupFanSpeedControl("vent-fan2", 67)
    setupFanSpeedControl("fan-speed", 45)

    function setupFanSpeedControl(idPrefix, commandId) {
      const upBtn = document.getElementById(`${idPrefix}-up`)
      const downBtn = document.getElementById(`${idPrefix}-down`)
      const valueDisplay = document.getElementById(`${idPrefix}-value`)
      if (upBtn && downBtn && valueDisplay) {
        let fanSpeed = 30
        valueDisplay.textContent = fanSpeed + "%"
        upBtn.addEventListener("click", () => {
          if (fanSpeed < 100) {
            fanSpeed = Math.min(fanSpeed + 10, 100)
            valueDisplay.textContent = `${fanSpeed}%`
            sendFanSpeedCommand(commandId, Math.round(fanSpeed / 10))
          }
        })
        downBtn.addEventListener("click", () => {
          if (fanSpeed > 0) {
            fanSpeed = Math.max(fanSpeed - 10, 0)
            valueDisplay.textContent = `${fanSpeed}%`
            sendFanSpeedCommand(commandId, Math.round(fanSpeed / 10))
          }
        })
      }
    }

    // Vent timer example, if an element exists
    const ventTimerEl = document.getElementById("vent-timer")
    ventTimerEl?.addEventListener("change", () =>
      sendVentTimerCommand(ventTimerEl.value)
    )
  }

  function setupHvacModeButtons() {
    const buttonGroups = [
      ["24", "89", "23", "22"], // HVAC mode buttons
      ["25", "26", "27"], // Fan speed buttons
    ]
    buttonGroups.forEach((group) => {
      const buttons = group
        .map((id) =>
          document.querySelector(`.pill-btn.toggle-btn[data-id="${id}"]`)
        )
        .filter((btn) => btn !== null)
      buttons.forEach((btn) => {
        btn.addEventListener("click", function () {
          const compId = parseInt(this.dataset.id, 10)
          buttons.forEach((b) => {
            if (b !== this && b.classList.contains("active")) {
              b.classList.remove("active")
              sendToggleButtonCommand(parseInt(b.dataset.id, 10), false)
            }
          })
          this.classList.add("active")
          sendToggleButtonCommand(compId, true)
        })
      })
    })
  }

  function setupMutuallyExclusiveButtons() {
    const groups = [
      ["21", "22", "23"], // Example group IDs
    ]
    groups.forEach((group) => {
      const buttons = group
        .map((id) => document.querySelector(`.toggle-btn[data-id="${id}"]`))
        .filter((btn) => btn !== null)
      buttons.forEach((btn) => {
        btn.addEventListener("click", function () {
          if (this.classList.contains("active")) return
          buttons.forEach((b) => {
            if (b !== this && b.classList.contains("active")) {
              b.classList.remove("active")
              sendToggleButtonCommand(parseInt(b.dataset.id, 10), false)
            }
          })
          this.classList.add("active")
          sendToggleButtonCommand(parseInt(this.dataset.id, 10), true)
        })
      })
    })
  }

  function setupVentilationButtons() {
    // Setup two vent control groups by data-id values
    setupVentGroup("60", "61", "62")
    setupVentGroup("65", "66", "67")

    function setupVentGroup(onOffId, intakeId, exhaustId) {
      const onOffBtn = document.querySelector(
        `.toggle-btn[data-id="${onOffId}"]`
      )
      const intakeBtn = document.querySelector(
        `.toggle-btn[data-id="${intakeId}"]`
      )
      const exhaustBtn = document.querySelector(
        `.toggle-btn[data-id="${exhaustId}"]`
      )
      if (!onOffBtn || !intakeBtn || !exhaustBtn) return
      // Mark as vent mode buttons for styling
      intakeBtn.classList.add("vent-mode-btn")
      exhaustBtn.classList.add("vent-mode-btn")

      updateModeButtonsState()
      onOffBtn.addEventListener("click", () =>
        setTimeout(updateModeButtonsState, 0)
      )
      intakeBtn.addEventListener("click", (e) => {
        if (!onOffBtn.classList.contains("active")) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
        if (!intakeBtn.classList.contains("active"))
          exhaustBtn.classList.remove("active")
      })
      exhaustBtn.addEventListener("click", (e) => {
        if (!onOffBtn.classList.contains("active")) {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
        if (!exhaustBtn.classList.contains("active"))
          intakeBtn.classList.remove("active")
      })

      function updateModeButtonsState() {
        const isOn = onOffBtn.classList.contains("active")
        if (!isOn) {
          intakeBtn.classList.remove("active")
          exhaustBtn.classList.remove("active")
        }
        intakeBtn.classList.toggle("disabled", !isOn)
        exhaustBtn.classList.toggle("disabled", !isOn)
      }
    }
  }

  function setupAcLimitModal() {
    const acLimitBtn = document.getElementById("ac-limit-btn")
    const acLimitModal = document.getElementById("ac-limit-modal")
    const closeModal = document.querySelector(".close-limit")
    const cancelBtn = document.getElementById("cancel-limit")
    const applyBtn = document.getElementById("apply-limit")
    const acLimitValue = document.getElementById("ac-limit-value")
    const acLimitUp = document.getElementById("ac-limit-up")
    const acLimitDown = document.getElementById("ac-limit-down")
    const presetBtns = document.querySelectorAll(".preset-btn")
    let currentAcLimit = 30

    acLimitBtn?.addEventListener("click", (e) => {
      e.preventDefault()
      acLimitModal.style.display = "flex"
      acLimitValue.textContent = currentAcLimit
      updatePresetButtons(currentAcLimit)
    })
    acLimitUp?.addEventListener("click", () => {
      if (currentAcLimit < 50) {
        currentAcLimit++
        acLimitValue.textContent = currentAcLimit
        updatePresetButtons(currentAcLimit)
      }
    })
    acLimitDown?.addEventListener("click", () => {
      if (currentAcLimit > 0) {
        currentAcLimit--
        acLimitValue.textContent = currentAcLimit
        updatePresetButtons(currentAcLimit)
      }
    })
    closeModal?.addEventListener("click", closeAcLimitModal)
    cancelBtn?.addEventListener("click", closeAcLimitModal)
    applyBtn?.addEventListener("click", () => {
      if (isSocketOpen()) sendAcLimitCommand(currentAcLimit)
      closeAcLimitModal()
    })
    presetBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        currentAcLimit = parseInt(this.dataset.value, 10)
        acLimitValue.textContent = currentAcLimit
        updatePresetButtons(currentAcLimit)
      })
    })
    window.addEventListener("click", (event) => {
      if (event.target === acLimitModal) closeAcLimitModal()
    })

    function closeAcLimitModal() {
      acLimitModal.style.display = "none"
    }

    function updatePresetButtons(value) {
      presetBtns.forEach((b) => {
        b.classList.toggle("active", parseInt(b.dataset.value, 10) === value)
      })
    }
  }

  // --------------------------
  // Color Conversion & UI Helpers
  // --------------------------
  function updateColorSlider(zone, hexColor) {
    const r = parseInt(hexColor.substring(1, 3), 16)
    const g = parseInt(hexColor.substring(3, 5), 16)
    const b = parseInt(hexColor.substring(5, 7), 16)
    const [h, s, l] = rgbToHsl(r, g, b)
    const slider = document.getElementById(`hue-zone${zone}`)
    if (slider) {
      slider.value = Math.round(h * 360)
      const valueDisplay = slider.nextElementSibling
      if (valueDisplay)
        valueDisplay.textContent = getColorName(Math.round(h * 360))
    }
  }

  function rgbToHsl(r, g, b) {
    r /= 255
    g /= 255
    b /= 255
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b)
    let h,
      s,
      l = (max + min) / 2
    if (max === min) {
      h = s = 0 // achromatic
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }
    return [h, s, l]
  }

  function hslToHex(h, s, l) {
    h /= 360
    s /= 100
    l /= 100
    let r, g, b
    if (s === 0) {
      r = g = b = l
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1
        if (t > 1) t -= 1
        if (t < 1 / 6) return p + (q - p) * 6 * t
        if (t < 1 / 2) return q
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
        return p
      }
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s
      const p = 2 * l - q
      r = hue2rgb(p, q, h + 1 / 3)
      g = hue2rgb(p, q, h)
      b = hue2rgb(p, q, h - 1 / 3)
    }
    const toHex = (x) => {
      const hex = Math.round(x * 255).toString(16)
      return hex.length === 1 ? "0" + hex : hex
    }
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  function getColorName(hue) {
    const colorNames = [
      { name: "Red", range: [0, 15] },
      { name: "Orange", range: [16, 45] },
      { name: "Yellow", range: [46, 75] },
      { name: "Lime", range: [76, 105] },
      { name: "Green", range: [106, 165] },
      { name: "Teal", range: [166, 195] },
      { name: "Cyan", range: [196, 225] },
      { name: "Blue", range: [226, 255] },
      { name: "Purple", range: [256, 285] },
      { name: "Magenta", range: [286, 335] },
      { name: "Pink", range: [336, 359] },
    ]
    for (const color of colorNames) {
      if (hue >= color.range[0] && hue <= color.range[1]) {
        return color.name
      }
    }
    return "Custom"
  }

  // --------------------------
  // Initialization on DOM Ready
  // --------------------------
  document
    .getElementById("show-monitor")
    ?.addEventListener("click", showSignalMonitor)
  document.addEventListener("DOMContentLoaded", () => {
    setupMainTabs()
    setupHvacTabs()
    setupLightingTabs()
    setupThermostat()
    setupSliders()
    setupVentControls()
    setupRgbZones()
    setupHvacModeButtons()
    setupMutuallyExclusiveButtons()
    setupVentilationButtons()
    setupAcLimitModal()
    connectWebSocket()
    initializeButtons()
    setTimeout(() => {
      const overlay = document.getElementById("splash-overlay")
      // Add the 'hidden' class to fade out the overlay
      overlay.classList.add("hidden")

      // Optionally, remove the element from the DOM after the fade-out transition
      setTimeout(() => {
        overlay.remove()
      }, 2000) // 500ms matches the CSS transition duration
    }, 2500) // Delay before the overlay fades out (adjust as needed)
  })
})()
