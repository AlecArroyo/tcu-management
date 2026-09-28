import type { GridFilterModel, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';

export interface Student {
  id: string;
  nombre: string;
  apellido1: string;
  apellido2: string;
  email: string;
  isActive: boolean;
}

export type Employee = Student;

const API_BASE_URL = 'https://sistematizacion-web-api.azurewebsites.net/api';
const STUDENTS_ENDPOINT = `${API_BASE_URL}/estudiantes`;

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Error al consultar la API');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getMany({
  paginationModel,
  filterModel,
  sortModel,
}: {
  paginationModel: GridPaginationModel;
  sortModel: GridSortModel;
  filterModel: GridFilterModel;
}): Promise<{ items: Student[]; itemCount: number }> {
  const students = await requestJson<Student[]>(STUDENTS_ENDPOINT);

  let filteredStudents = [...students];

  if (filterModel?.items?.length) {
    filterModel.items.forEach(({ field, value, operator }) => {
      if (!field || value == null) {
        return;
      }

      filteredStudents = filteredStudents.filter((student) => {
        const studentValue = student[field as keyof Student];

        switch (operator) {
          case 'contains':
            return String(studentValue).toLowerCase().includes(String(value).toLowerCase());
          case 'equals':
            return studentValue === value;
          case 'startsWith':
            return String(studentValue).toLowerCase().startsWith(String(value).toLowerCase());
          case 'endsWith':
            return String(studentValue).toLowerCase().endsWith(String(value).toLowerCase());
          case '>':
            return studentValue > value;
          case '<':
            return studentValue < value;
          default:
            return true;
        }
      });
    });
  }

  if (sortModel?.length) {
    filteredStudents.sort((a, b) => {
      for (const { field, sort } of sortModel) {
        const left = a[field as keyof Student];
        const right = b[field as keyof Student];

        if (left < right) {
          return sort === 'asc' ? -1 : 1;
        }
        if (left > right) {
          return sort === 'asc' ? 1 : -1;
        }
      }
      return 0;
    });
  }

  const start = paginationModel.page * paginationModel.pageSize;
  const end = start + paginationModel.pageSize;

  return {
    items: filteredStudents.slice(start, end),
    itemCount: filteredStudents.length,
  };
}

export async function getOne(studentId: string) {
  return requestJson<Student>(`${STUDENTS_ENDPOINT}/${studentId}`);
}

export async function createOne(data: Omit<Student, 'id'>) {
  return requestJson<Student>(STUDENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateOne(studentId: string, data: Partial<Omit<Student, 'id'>>) {
  const existingStudent = await getOne(studentId);

  await requestJson<void>(`${STUDENTS_ENDPOINT}/${studentId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...existingStudent,
      ...data,
      id: studentId,
    }),
  });

  return { ...existingStudent, ...data, id: studentId } as Student;
}

export async function deleteOne(studentId: string) {
  await requestJson<void>(`${STUDENTS_ENDPOINT}/${studentId}`, {
    method: 'DELETE',
  });
}

type ValidationResult = { issues: { message: string; path: (keyof Student)[] }[] };

export function validate(student: Partial<Student>): ValidationResult {
  const issues: ValidationResult['issues'] = [];

  if (!student.nombre) {
    issues.push({ message: 'El nombre es requerido', path: ['nombre'] });
  }

  if (!student.apellido1) {
    issues.push({ message: 'El primer apellido es requerido', path: ['apellido1'] });
  }

  if (!student.apellido2) {
    issues.push({ message: 'El segundo apellido es requerido', path: ['apellido2'] });
  }

  if (!student.email) {
    issues.push({ message: 'El correo es requerido', path: ['email'] });
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.email)) {
    issues.push({ message: 'El correo no tiene un formato válido', path: ['email'] });
  }

  return { issues };
}
