const encodeImageLSB = async (imageDataURL, encryptedData) => {
    return new Promise((resolve, reject) => {
      const coverCanvas = document.createElement('canvas')
      const coverCtx = coverCanvas.getContext('2d')
      const coverImg = new Image()

      coverImg.onload = () => {
        try {
          coverCanvas.width = coverImg.width
          coverCanvas.height = coverImg.height
          coverCtx.drawImage(coverImg, 0, 0)

          const coverData = coverCtx.getImageData(0, 0, coverCanvas.width, coverCanvas.height)
          
          // Convert to binary
          const dataBits = encryptedData.split('').map(char =>
            char.charCodeAt(0).toString(2).padStart(8, '0')
          ).join('')
          
          // Add length prefix (32 bits)
          const lengthBits = dataBits.length.toString(2).padStart(32, '0')
          const allBits = lengthBits + dataBits

          if (allBits.length > coverData.data.length / 2 - 32) {
            throw new Error('Cover image is too small to hide the secret data.')
          }

          // Embed the data using LSB
          const data = coverData.data
          for (let i = 0; i < allBits.length; i++) {
            const pixelIndex = Math.floor(i / 2) * 4
            const colorOffset = i % 2
            data[pixelIndex + colorOffset] = (data[pixelIndex + colorOffset] & 254) | parseInt(allBits[i])
          }

          // Set marker
          data[data.length - 4] = (data[data.length - 4] & 254) | 1

          coverCtx.putImageData(coverData, 0, 0)
          const resultUrl = coverCanvas.toDataURL('image/png')
          setResultImage(resultUrl)
          resolve()
        } catch (error) {
          reject(error)
        }
      }

      coverImg.onerror = () => {
        reject(new Error('Error loading cover image'))
      }

      coverImg.src = imageDataURL
    })
  }