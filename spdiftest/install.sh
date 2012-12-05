#!/bin/bash
if [ -z "$LMC_IP" ]; then
	echo "LMC_IP environment variable must be set"
	exit 5
fi

SERVICE=spdiftest.service
MD5SUM="f07a3a5bb6c32db7c5f9339ce31ebb74  /media/BOOT/grid.rbf"
DEST=/etc/systemd/system/spdiftest.service
GRID=grid.rbf
GRIDDEST=/media/BOOT/grid.rbf
SSHEXEC="ssh -o StrictHostKeyChecking=false lophilo@$LMC_IP"
SCPEXEC="scp -o StrictHostKeyChecking=false"

SSH=`echo "" | nc $LMC_IP 22 -q 1 | grep dropbear`
if [ -z "$SSH" ]; then
	echo "SSH service on $LMC_IP not up yet"
	exit 10
fi

if [ "$1" == "remove" ]; then
	$SSHEXEC "sudo systemctl disable $SERVICE"
	if [ "$?" -ne 0 ]; then
		echo "Could not disable $SERVICE on $LMC_IP"
		exit 1
	fi
	$SSHEXEC "sudo rm -f $DEST"
	if [ "$?" -ne 0 ]; then
		echo "Could not remove $SERVICE on $LMC_IP"
		exit 2
	fi
	$SSHEXEC "[ -f $GRIDDEST.original ]"
	if [ "$?" -eq 0 ]; then
		echo "Backup $GRIDDEST.original does not exist"
		exit 2
	fi
	$SSHEXEC "sudo mv $GRIDDEST.original $GRIDDEST"
	if [ "$?" -ne 0 ]; then
		echo "Could not move from $GRIDDEST.original to $GRIDDEST"
		exit 3
	fi
	exit 0
fi

RESULT=`$SSHEXEC "md5sum $GRIDDEST"`
if [ "$RESULT" != "$MD5SUM" ]; then
	echo "$RESULT does not match $MD5SUM"
	echo "Test grid not installed, installing..."
	$SCPEXEC $GRID lophilo@$LMC_IP:
	if [ "$?" -ne 0 ]; then
		echo "Could not copy test grid file"
		exit 4
	fi
	$SSHEXEC "sudo cp $GRIDDEST $GRIDDEST.original"
	if [ "$?" -ne 0 ]; then
		echo "Could not backup original grid file"
		exit 5
	fi
	$SSHEXEC "sudo cp $GRID $GRIDDEST"
	if [ "$?" -ne 0 ]; then
		echo "Could not replace original grid with test grid file"
		exit 6
	fi
else
	echo "Test GRID file already installed"
fi

$SSHEXEC "[ -f $DEST ]"
if [  $? -ne 0 ]; then
	echo "service not installed, installing..."
	$SCPEXEC $SERVICE lophilo@$LMC_IP:
	if [ "$?" -ne 0 ]; then
		echo "Could not copy $SERVICE to $LMC_IP"
		exit 20
	fi
	$SSHEXEC "sudo cp $SERVICE $DEST"
	if [ "$?" -ne 0 ]; then
		echo "Could not install $SERVICE on $LMC_IP"
		exit 30
	fi
	echo "Enabling service on $LMC_IP"
	$SSHEXEC "sudo systemctl enable spdiftest.service"
	$SSHEXEC "sudo systemctl --system daemon-reload"
	if [ "$?" -ne 0 ]; then
		echo "Could not run service on $LMC_IP or test failed"
		exit 40
	fi
else
	echo "service already installed"
fi

#echo "Rebooting (connect optical cable; after 30s, LED0 should flash)"
#$SSHEXEC "sudo reboot"

echo "Reloading (connect optical cable; LED0 should flash)"
$SSHEXEC "sudo systemctl restart spdiftest.service"
