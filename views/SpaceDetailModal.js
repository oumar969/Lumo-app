import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSpaces } from '../context/SpaceContext';

function RoleBadge({ role }) {
  const isOwner = role === 'owner';
  return (
    <View style={[styles.badge, isOwner ? styles.badgeOwner : styles.badgeMember]}>
      <Text style={[styles.badgeText, isOwner && styles.badgeTextOwner]}>
        {isOwner ? 'Ejer' : 'Medlem'}
      </Text>
    </View>
  );
}

function MemberRow({ member }) {
  const name = member.display_name || member.displayName || member.email || 'Ukendt bruger';
  return (
    <View style={styles.memberRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <Text style={styles.memberName} numberOfLines={1}>{name}</Text>
      <RoleBadge role={member.role} />
    </View>
  );
}

export default function SpaceDetailModal({ space, visible, onClose }) {
  const navigation = useNavigation();
  const { setActiveSpace } = useSpaces();

  if (!space) return null;

  const members = space.members || [];

  function handleOpenCanvas() {
    setActiveSpace(space);
    onClose();
    navigation.navigate('Canvas');
  }

  function handleOpenNotes() {
    setActiveSpace(space);
    onClose();
    navigation.navigate('Noter');
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Space name + close */}
          <View style={styles.sheetHeader}>
            <Text style={styles.spaceName} numberOfLines={2}>{space.name}</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Invite code */}
          {space.invite_code ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Invitationskode</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{space.invite_code}</Text>
              </View>
            </View>
          ) : null}

          {/* Members */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Medlemmer ({members.length})
            </Text>
            {members.length === 0 ? (
              <Text style={styles.emptyMembers}>Ingen medlemmer endnu</Text>
            ) : (
              <FlatList
                data={members}
                keyExtractor={(m, i) => m.uid || m.id || m._id || String(i)}
                renderItem={({ item }) => <MemberRow member={item} />}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>

          {/* Open canvas / notes */}
          <View style={styles.actionsRow}>
            <TouchableOpacity style={[styles.canvasBtn, styles.actionFlex]} onPress={handleOpenCanvas}>
              <Text style={styles.canvasBtnText}>Åbn Canvas</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.notesBtn, styles.actionFlex]} onPress={handleOpenNotes}>
              <Text style={styles.notesBtnText}>Åbn Noter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#2a2a3e',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  spaceName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  codeBox: {
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  codeText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#a78bfa',
    letterSpacing: 5,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#a78bfa',
    fontWeight: '700',
    fontSize: 15,
  },
  memberName: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeOwner: {
    backgroundColor: 'rgba(167,139,250,0.2)',
    borderWidth: 1,
    borderColor: '#a78bfa',
  },
  badgeMember: {
    backgroundColor: '#1e1e2e',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  badgeTextOwner: {
    color: '#a78bfa',
  },
  separator: {
    height: 1,
    backgroundColor: '#1e1e2e',
  },
  emptyMembers: {
    color: '#444',
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionFlex: {
    flex: 1,
  },
  canvasBtn: {
    backgroundColor: '#a78bfa',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  canvasBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  notesBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#f472b6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  notesBtnText: {
    color: '#f472b6',
    fontSize: 16,
    fontWeight: '700',
  },
});
