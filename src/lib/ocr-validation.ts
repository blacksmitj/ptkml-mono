import prisma from "./prisma";

/**
 * Validates manual employee input fields against OCR extracted values.
 * Records the matching results in the OcrValidation model.
 */
export async function validateEmployeeOcr(employeeId: string, client: any = prisma) {
  try {
    const employee = await client.employee.findUnique({
      where: { id: employeeId },
      include: {
        files: {
          include: {
            ocrResult: true,
          },
        },
      },
    });

    if (!employee) return;

    for (const file of employee.files) {
      if (file.ocrResult && file.ocrResult.status === "COMPLETED") {
        const parsedData = file.ocrResult.parsedData as any;
        if (!parsedData) continue;

        // 1. Clean up existing validations for this ocrResult
        await client.ocrValidation.deleteMany({
          where: { ocrResultId: file.ocrResult.id },
        });

        // 2. Perform validation for KTP
        if (file.category === "EMPLOYEE_KTP") {
          // Validate NIK
          if (employee.nik && parsedData.nik) {
            const manualValue = employee.nik.trim();
            const extractedValue = parsedData.nik.trim();
            const isMatch = manualValue === extractedValue;

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "nik",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }

          // Validate Name
          if (employee.name && parsedData.name) {
            const manualValue = employee.name.trim().toLowerCase();
            const extractedValue = parsedData.name.trim().toLowerCase();

            // Simple match or fuzzy containment
            const isMatch =
              manualValue === extractedValue ||
              manualValue.includes(extractedValue) ||
              extractedValue.includes(manualValue);

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "name",
                manualValue: employee.name,
                extractedValue: parsedData.name,
                isMatch,
              },
            });
          }
        }

        // 3. Perform validation for BPJS Card
        if (file.category === "EMPLOYEE_BPJS_CARD") {
          if (employee.bpjsNumber && parsedData.bpjsNumber) {
            const manualValue = employee.bpjsNumber.trim();
            const extractedValue = parsedData.bpjsNumber.trim();
            const isMatch = manualValue === extractedValue;

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "bpjsNumber",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }

          if (employee.name && parsedData.name) {
            const manualValue = employee.name.trim();
            const extractedValue = parsedData.name.trim();
            const manualNameLower = manualValue.toLowerCase();
            const extractedNameLower = extractedValue.toLowerCase();
            const isMatch =
              manualNameLower === extractedNameLower ||
              manualNameLower.includes(extractedNameLower) ||
              extractedNameLower.includes(manualNameLower);

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "name",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }
        }

        // 4. Perform validation for Salary Slip
        if (file.category === "EMPLOYEE_SALARY_SLIP") {
          if (employee.name && parsedData.name) {
            const manualValue = employee.name.trim();
            const extractedValue = parsedData.name.trim();
            const manualNameLower = manualValue.toLowerCase();
            const extractedNameLower = extractedValue.toLowerCase();
            const isMatch =
              manualNameLower === extractedNameLower ||
              manualNameLower.includes(extractedNameLower) ||
              extractedNameLower.includes(manualNameLower);

            await client.ocrValidation.create({
              data: {
                ocrResultId: file.ocrResult.id,
                fieldName: "name",
                manualValue,
                extractedValue,
                isMatch,
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error validating OCR for employee ${employeeId}:`, error);
  }
}
