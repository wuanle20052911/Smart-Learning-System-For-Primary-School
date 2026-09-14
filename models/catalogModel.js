const { getSupabaseClient } = require('./supabaseClient');

const localClassStore = {
  classes: new Map(),
  studentsByClass: new Map()
};

function resetLocalClassStore() {
  localClassStore.classes.clear();
  localClassStore.studentsByClass.clear();
}

function createLocalSchoolClass(name, grade, assignedTeacherId) {
  const normalizedName = String(name || '').trim();
  const normalizedGrade = String(grade || '').trim();
  if (!normalizedName || !normalizedGrade) {
    throw new Error('Tên lớp và khối lớp không được để trống.');
  }
  const classId = `local-class-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const item = {
    id: classId,
    name: normalizedName,
    grade: normalizedGrade,
    created_at: new Date().toISOString(),
    assigned_teacher_id: assignedTeacherId || null,
    assigned_teacher_name: assignedTeacherId || null,
    assigned_teacher_email: assignedTeacherId || null,
    created_by: assignedTeacherId || 'local-admin'
  };
  localClassStore.classes.set(classId, item);
  localClassStore.studentsByClass.set(classId, []);
  return item;
}

function addLocalStudentToClass(classId, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email học sinh không hợp lệ.');
  }
  if (!localClassStore.classes.has(classId)) {
    throw new Error('Không tìm thấy lớp học để thêm học sinh.');
  }
  const students = localClassStore.studentsByClass.get(classId) || [];
  const duplicate = students.some((student) => student.email === normalizedEmail);
  if (duplicate) {
    return students.find((student) => student.email === normalizedEmail);
  }
  const student = {
    id: `local-student-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    full_name: normalizedEmail,
    email: normalizedEmail,
    avatar_url: null,
    joined_at: new Date().toISOString(),
    class_id: classId
  };
  students.push(student);
  localClassStore.studentsByClass.set(classId, students);
  return student;
}

function listLocalClasses(teacherId) {
  const items = Array.from(localClassStore.classes.values());
  if (teacherId) {
    return items.filter((item) => item.assigned_teacher_id === teacherId || item.created_by === teacherId);
  }
  return items;
}

function listLocalClassStudents(classId) {
  return localClassStore.studentsByClass.get(classId) || [];
}

async function list(client, table, fields = '*') {
  try {
    const { data, error } = await client.from(table).select(fields).order('name');
    if (error) throw error;
    return data;
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return [];
  }
}

async function create(client, table, payload) {
  try {
    const { data, error } = await client.from(table).insert(payload).select('*').single();
    if (error) throw error;
    return data;
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return createLocalSchoolClass(payload.name, payload.grade, payload.created_by || null);
  }
}

async function listClasses(client, teacherId) {
  try {
    const { data, error } = await client
      .from('classes')
      .select('id,name,grade,created_at,assigned_teacher_id')
      .or(`created_by.eq.${teacherId},assigned_teacher_id.eq.${teacherId}`)
      .order('name');
    if (error) throw error;
    return data;
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return listLocalClasses(teacherId);
  }
}

async function listClassStudents(client, classId) {
  try {
    const { data, error } = await client.rpc('teacher_list_class_students', {
      target_class_id: classId
    });
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return listLocalClassStudents(classId);
  }
}

async function addClassMember(client, classId, email) {
  try {
    const { data, error } = await client.rpc('add_student_to_class', {
      target_class_id: classId,
      target_email: email
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return addLocalStudentToClass(classId, email);
  }
}

async function listTeachers(client) {
  try {
    const { data, error } = await client.rpc('manager_list_teachers');
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return [{ id: 'teacher-001', full_name: 'Giáo viên mẫu', email: 'teacher@example.com' }];
  }
}

async function listManagedClasses(client) {
  try {
    const { data, error } = await client.rpc('manager_list_classes');
    if (error) throw error;
    return data || [];
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return listLocalClasses();
  }
}

async function managerCreateClass(client, name, grade, teacherId) {
  try {
    const { data, error } = await client.rpc('manager_create_class', {
      target_name: name,
      target_grade: grade,
      target_teacher_id: teacherId
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return createLocalSchoolClass(name, grade, teacherId);
  }
}

async function managerAddClassMember(client, classId, email) {
  try {
    const { data, error } = await client.rpc('manager_add_student_to_class', {
      target_class_id: classId,
      target_email: email
    });
    if (error) throw error;
    return data;
  } catch (error) {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      throw error;
    }
    return addLocalStudentToClass(classId, email);
  }
}

module.exports = {
  getSupabaseClient,
  list,
  create,
  listClasses,
  listClassStudents,
  addClassMember,
  listTeachers,
  listManagedClasses,
  managerCreateClass,
  managerAddClassMember,
  createLocalSchoolClass,
  addLocalStudentToClass,
  listLocalClasses,
  listLocalClassStudents,
  resetLocalClassStore
};
